/**
 * Live stream driver for `@anthropic-ai/claude-agent-sdk` `query()`.
 * Relies on the Claude Code binary bundled with the Agent SDK (platform-specific optionalDependency).
 */
import { randomUUID } from 'node:crypto'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type {
  SDKMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
  SubagentStartHookInput,
  SubagentStopHookInput,
} from '@anthropic-ai/claude-agent-sdk'
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { Client } from 'langsmith'
import { startSpan } from 'braintrust'
import type { AgentStreamRequest, PipelinePhase, StreamEvent } from '../shared/streamProtocol.ts'
import {
  betaAssistantMessageToFeed,
  betaFinalMessageToolTail,
  betaStreamEventToFeed,
  createBetaFeedState,
  inferPipelinePhaseFromMcpStreamEvent,
  resetBetaFeedState,
} from './agentSdkBetaFeed.ts'
import { novamindMcpScriptPath, resolveClaudeCodeExecutable } from './agentSdkPaths.ts'
import { createLangSmithChildRun, endLangSmithChildRun } from './langsmithChildRun.ts'
import {
  AGENT_CITATION,
  AGENT_DATA,
  AGENT_HYPOTHESIS,
  AGENT_LITERATURE,
  buildPipelineSdkUserPrompt,
  CITATION_AGENT_SYSTEM,
  DATA_AGENT_SYSTEM,
  HYPOTHESIS_AGENT_SYSTEM,
  LITERATURE_AGENT_SYSTEM,
  MCP_SERVER_NAME,
  MCP_TOOL_DEMO_TRAJECTORY,
  MCP_TOOL_EXPERIMENT,
  MCP_TOOL_PUBMED,
  MCP_TOOL_VERIFY_PMIDS,
} from './researchPrompts.ts'

const DEFAULT_ORCHESTRATOR_MODEL = 'claude-opus-4-7'

function orchEvent(
  phase: string,
  title: string,
  detail?: string,
  model?: string,
  langsmithChildId?: string,
  braintrustSpanName?: string,
): StreamEvent {
  return {
    type: 'orch_step',
    id: randomUUID(),
    phase,
    title,
    detail,
    model,
    langsmithChildId,
    braintrustSpanName,
  }
}

type BtSpan = ReturnType<typeof startSpan>

export type RunAgentSdkContext = {
  ls: Client
  runId: string
  /** Result of `await rootSpan.export()` for nested Braintrust spans. */
  btParentExport: string | undefined
  langsmithProjectName?: string
}

/** Accumulates streamed assistant text for LangSmith / Braintrust finalizers. */
export type AssembledRef = { text: string }

export async function* runAgentSdkLive(
  body: AgentStreamRequest,
  signal: AbortSignal,
  promptForModel: string,
  sdkCtx: RunAgentSdkContext,
  assembledRef: AssembledRef,
): AsyncGenerator<StreamEvent> {
  const runMode = body.runMode ?? 'single'
  const singleModel = (body.model?.trim() || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929').trim()
  const workerModel = (body.subagentModel?.trim() || body.model?.trim() || singleModel).trim()
  const orchestratorModel = (body.orchestratorModel?.trim() || DEFAULT_ORCHESTRATOR_MODEL).trim()
  const enableThinking = Boolean(body.enableThinking && runMode === 'single')

  const ac = new AbortController()
  const onAbort = () => ac.abort()
  signal.addEventListener('abort', onAbort)

  const queued: StreamEvent[] = []
  const enqueue = (...evs: StreamEvent[]) => {
    queued.push(...evs)
  }

  function* flushQueue(): Generator<StreamEvent> {
    while (queued.length) {
      const ev = queued.shift()
      if (ev) yield ev
    }
  }

  const titlePrefixRef = { value: 'Assistant' }
  /** Specialist phase while a pipeline sub-agent is running; cleared on SubagentStop. Used when `parent_tool_use_id` is set or for MCP inference. */
  const activeSubagentPhaseRef = { value: null as PipelinePhase | null }
  const feedState = createBetaFeedState(assembledRef)

  let orchLsId: string | null = null
  let litLsId: string | null = null
  let dataLsId: string | null = null
  let hypLsId: string | null = null
  let citeLsId: string | null = null
  let lsOrder = 2

  let orchBt: BtSpan | null = null
  let litBt: BtSpan | null = null
  let dataBt: BtSpan | null = null
  let hypBt: BtSpan | null = null
  let citeBt: BtSpan | null = null

  const mainBufRef = { text: '' }
  let sawLiteratureStart = false
  /** Orchestrator LangSmith child output — main-thread text deltas before the literature subagent starts. */
  const mainCapture = { active: runMode === 'pipeline' }

  if (runMode === 'tools') {
    titlePrefixRef.value = 'Research assistant'
  } else if (runMode === 'single') {
    titlePrefixRef.value = 'Assistant'
  }

  const { ls, runId, btParentExport, langsmithProjectName } = sdkCtx

  const mcpScript = novamindMcpScriptPath()
  const mcpServerDef = {
    type: 'stdio' as const,
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsx', mcpScript],
    env: process.env as Record<string, string>,
  }

  try {
    const phaseWallStartedAt: Partial<Record<PipelinePhase, number>> = {}
    const markPhaseWall = (phase: PipelinePhase) => {
      phaseWallStartedAt[phase] = Date.now()
    }
    const phaseEndEvent = (phase: PipelinePhase): StreamEvent => {
      const t0 = phaseWallStartedAt[phase]
      const durationMs = t0 != null ? Math.max(0, Date.now() - t0) : undefined
      return { type: 'phase_end', phase, ...(durationMs != null ? { durationMs } : {}) }
    }

    if (runMode === 'pipeline') {
      titlePrefixRef.value = 'Orchestrator'

      yield orchEvent(
        'trace',
        'LangSmith · hierarchical trace',
        `Root run ${runId.slice(0, 8)}… · child runs = orchestrator + each sub-agent (compare latency, tool paths, token shape).`,
        undefined,
        runId,
      )
      yield orchEvent(
        'braintrust',
        'Braintrust · nested spans',
        'Root span + one child per phase — scores / experiments attach per span; failed rubrics block promote.',
        undefined,
        undefined,
        'novamind-live-demo',
      )
      yield orchEvent(
        'eval',
        'Eval frameworks',
        'Transcript + tool I/O → offline suites + online gates; Claude Agent SDK surfaces map cleanly to grader inputs.',
      )
      yield {
        type: 'obs',
        tone: 'neutral',
        text: `orchestration: pipeline · Claude Agent SDK · Opus-class main (${orchestratorModel}) → workers (${workerModel}) · MCP (${MCP_SERVER_NAME}) + Agent tool`,
      }

      orchBt = startSpan({
        name: 'orchestrator.delegate',
        parent: btParentExport,
        event: { input: { model: orchestratorModel, phase: 'orchestrator' } },
      })
      const orchLs = await createLangSmithChildRun(ls, {
        traceId: runId,
        parentRunId: runId,
        name: 'orchestrator.opus_delegate',
        run_type: 'chain',
        inputs: { model: orchestratorModel, prompt_excerpt: body.prompt.slice(0, 1200) },
        project_name: langsmithProjectName,
        executionOrder: lsOrder++,
      })
      orchLsId = orchLs.childRunId

      yield {
        type: 'langsmith_child',
        name: 'orchestrator.opus_delegate',
        childRunId: orchLsId,
        parentRunId: runId,
        role: 'orchestrator',
      }
      yield {
        type: 'obs',
        tone: 'lf',
        text: `langsmith: child run ${orchLsId.slice(0, 8)}… (orchestrator · ${orchestratorModel})`,
      }
      markPhaseWall('orchestrator')
      yield { type: 'phase_start', phase: 'orchestrator', model: orchestratorModel, langsmithChildId: orchLsId }
      yield {
        type: 'braintrust_child',
        spanId: orchBt.spanId,
        name: 'orchestrator.delegate',
      }
      yield orchEvent(
        'orchestrator',
        'Planning model · delegate + policy',
        'Heavy model sets search strategy, JSON targets, citation zero-tolerance, and context budget notes before specialists run via Agent tool.',
        orchestratorModel,
        orchLsId,
        'orchestrator.delegate',
      )
    }

    let userPrompt = promptForModel
    if (runMode === 'pipeline') {
      userPrompt = buildPipelineSdkUserPrompt(promptForModel)
    }

    const pipelineAgents =
      runMode === 'pipeline'
        ? {
            [AGENT_LITERATURE]: {
              description: 'Literature review over ingested PubMed via MCP query_pubmed_corpus.',
              prompt: LITERATURE_AGENT_SYSTEM,
              model: workerModel,
              tools: [MCP_TOOL_PUBMED],
            },
            [AGENT_DATA]: {
              description: 'Validate themes against client experimental summaries via MCP.',
              prompt: DATA_AGENT_SYSTEM,
              model: workerModel,
              tools: [MCP_TOOL_EXPERIMENT, MCP_TOOL_DEMO_TRAJECTORY],
            },
            [AGENT_HYPOTHESIS]: {
              description: 'Structured hypotheses from literature + data handoffs (no tools).',
              prompt: HYPOTHESIS_AGENT_SYSTEM,
              model: workerModel,
              tools: [],
            },
            [AGENT_CITATION]: {
              description: 'Verify PMIDs in hypothesis text against session PubMed tool returns via MCP.',
              prompt: CITATION_AGENT_SYSTEM,
              model: workerModel,
              tools: [MCP_TOOL_VERIFY_PMIDS],
            },
          }
        : undefined

    const hooks =
      runMode === 'pipeline'
        ? {
            SubagentStart: [
              {
                hooks: [
                  async (input: SubagentStartHookInput) => {
                    if (input.agent_type === AGENT_LITERATURE && !sawLiteratureStart) {
                      sawLiteratureStart = true
                      mainCapture.active = false
                      /** Before any await: sub-agent stream events must not use a stale Orchestrator prefix. */
                      titlePrefixRef.value = 'Literature review'
                      activeSubagentPhaseRef.value = 'literature'
                      if (orchLsId) {
                        await endLangSmithChildRun(ls, orchLsId, {
                          outputs: { text: mainBufRef.text, model: orchestratorModel },
                        })
                      }
                      orchBt?.log({
                        output: { text: mainBufRef.text },
                        metadata: { model: orchestratorModel },
                      })
                      orchBt?.end()
                      orchBt = null

                      enqueue(phaseEndEvent('orchestrator'))

                      const litLs = await createLangSmithChildRun(ls, {
                        traceId: runId,
                        parentRunId: runId,
                        name: 'subagent.literature_review',
                        run_type: 'llm',
                        inputs: { model: workerModel, tools: ['query_pubmed_corpus'] },
                        project_name: langsmithProjectName,
                        executionOrder: lsOrder++,
                      })
                      litLsId = litLs.childRunId
                      litBt = startSpan({
                        name: 'subagent.literature',
                        parent: btParentExport,
                        event: { input: { model: workerModel, phase: 'literature' } },
                      })

                      enqueue({
                        type: 'langsmith_child',
                        name: 'subagent.literature_review',
                        childRunId: litLsId,
                        parentRunId: runId,
                        role: 'literature',
                      })
                      enqueue({
                        type: 'obs',
                        tone: 'lf',
                        text: `langsmith: child run ${litLsId.slice(0, 8)}… (literature · ${workerModel})`,
                      })
                      markPhaseWall('literature')
                      enqueue({ type: 'phase_start', phase: 'literature', model: workerModel, langsmithChildId: litLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: litBt.spanId,
                        name: 'subagent.literature',
                      })
                    } else if (input.agent_type === AGENT_DATA) {
                      titlePrefixRef.value = 'Data analysis'
                      activeSubagentPhaseRef.value = 'data'
                      const dataLs = await createLangSmithChildRun(ls, {
                        traceId: runId,
                        parentRunId: runId,
                        name: 'subagent.data_analysis',
                        run_type: 'llm',
                        inputs: { model: workerModel, tools: ['fetch_experiment_summary', 'demo_endpoint_trajectory'] },
                        project_name: langsmithProjectName,
                        executionOrder: lsOrder++,
                      })
                      dataLsId = dataLs.childRunId
                      dataBt = startSpan({
                        name: 'subagent.data_analysis',
                        parent: btParentExport,
                        event: { input: { model: workerModel, phase: 'data_analysis' } },
                      })

                      enqueue({
                        type: 'langsmith_child',
                        name: 'subagent.data_analysis',
                        childRunId: dataLsId,
                        parentRunId: runId,
                        role: 'data_analysis',
                      })
                      enqueue({
                        type: 'obs',
                        tone: 'lf',
                        text: `langsmith: child run ${dataLsId.slice(0, 8)}… (data analysis · ${workerModel})`,
                      })
                      markPhaseWall('data')
                      enqueue({ type: 'phase_start', phase: 'data', model: workerModel, langsmithChildId: dataLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: dataBt.spanId,
                        name: 'subagent.data_analysis',
                      })
                    } else if (input.agent_type === AGENT_HYPOTHESIS) {
                      titlePrefixRef.value = 'Hypothesis generation'
                      activeSubagentPhaseRef.value = 'hypothesis'
                      const hypLs = await createLangSmithChildRun(ls, {
                        traceId: runId,
                        parentRunId: runId,
                        name: 'subagent.hypothesis_generation',
                        run_type: 'llm',
                        inputs: { model: workerModel, tools: [] },
                        project_name: langsmithProjectName,
                        executionOrder: lsOrder++,
                      })
                      hypLsId = hypLs.childRunId
                      hypBt = startSpan({
                        name: 'subagent.hypothesis',
                        parent: btParentExport,
                        event: { input: { model: workerModel, phase: 'hypothesis' } },
                      })

                      enqueue({
                        type: 'langsmith_child',
                        name: 'subagent.hypothesis_generation',
                        childRunId: hypLsId,
                        parentRunId: runId,
                        role: 'hypothesis',
                      })
                      enqueue({
                        type: 'obs',
                        tone: 'lf',
                        text: `langsmith: child run ${hypLsId.slice(0, 8)}… (hypothesis · ${workerModel})`,
                      })
                      markPhaseWall('hypothesis')
                      enqueue({ type: 'phase_start', phase: 'hypothesis', model: workerModel, langsmithChildId: hypLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: hypBt.spanId,
                        name: 'subagent.hypothesis',
                      })
                    } else if (input.agent_type === AGENT_CITATION) {
                      titlePrefixRef.value = 'Citation audit'
                      activeSubagentPhaseRef.value = 'citation'
                      const citeLs = await createLangSmithChildRun(ls, {
                        traceId: runId,
                        parentRunId: runId,
                        name: 'subagent.citation_audit',
                        run_type: 'llm',
                        inputs: { model: workerModel, tools: ['verify_claimed_pmids'] },
                        project_name: langsmithProjectName,
                        executionOrder: lsOrder++,
                      })
                      citeLsId = citeLs.childRunId
                      citeBt = startSpan({
                        name: 'subagent.citation_audit',
                        parent: btParentExport,
                        event: { input: { model: workerModel, phase: 'citation_audit' } },
                      })

                      enqueue({
                        type: 'langsmith_child',
                        name: 'subagent.citation_audit',
                        childRunId: citeLsId,
                        parentRunId: runId,
                        role: 'citation_audit',
                      })
                      enqueue({
                        type: 'obs',
                        tone: 'lf',
                        text: `langsmith: child run ${citeLsId.slice(0, 8)}… (citation audit · ${workerModel})`,
                      })
                      markPhaseWall('citation')
                      enqueue({ type: 'phase_start', phase: 'citation', model: workerModel, langsmithChildId: citeLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: citeBt.spanId,
                        name: 'subagent.citation_audit',
                      })
                    }
                    return {}
                  },
                ],
              },
            ],
            SubagentStop: [
              {
                hooks: [
                  async (input: SubagentStopHookInput) => {
                    const tail = input.last_assistant_message ?? ''
                    if (input.agent_type === AGENT_LITERATURE && litLsId) {
                      activeSubagentPhaseRef.value = null
                      /** Main-thread checkpoints before next Agent call must show Orchestrator prefix. */
                      titlePrefixRef.value = 'Orchestrator'
                      litBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      litBt?.end()
                      litBt = null
                      await endLangSmithChildRun(ls, litLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue(phaseEndEvent('literature'))
                      enqueue({
                        type: 'obs',
                        tone: 'neutral',
                        text: 'orchestration: handoff · literature synthesis → Data analysis agent (client experimental plane)',
                      })
                    } else if (input.agent_type === AGENT_DATA && dataLsId) {
                      activeSubagentPhaseRef.value = null
                      titlePrefixRef.value = 'Orchestrator'
                      dataBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      dataBt?.end()
                      dataBt = null
                      await endLangSmithChildRun(ls, dataLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue(phaseEndEvent('data'))
                      enqueue({
                        type: 'obs',
                        tone: 'neutral',
                        text: 'orchestration: handoff · literature + data memos → Hypothesis generation',
                      })
                    } else if (input.agent_type === AGENT_HYPOTHESIS && hypLsId) {
                      activeSubagentPhaseRef.value = null
                      titlePrefixRef.value = 'Orchestrator'
                      hypBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      hypBt?.end()
                      hypBt = null
                      await endLangSmithChildRun(ls, hypLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue(phaseEndEvent('hypothesis'))
                      enqueue({
                        type: 'obs',
                        tone: 'neutral',
                        text: 'orchestration: handoff · ranked hypotheses → Citation audit (PMID verification via MCP)',
                      })
                    } else if (input.agent_type === AGENT_CITATION && citeLsId) {
                      activeSubagentPhaseRef.value = null
                      titlePrefixRef.value = 'Orchestrator'
                      citeBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      citeBt?.end()
                      citeBt = null
                      await endLangSmithChildRun(ls, citeLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue(phaseEndEvent('citation'))
                    }
                    return {}
                  },
                ],
              },
            ],
          }
        : undefined

    const claudeExe = resolveClaudeCodeExecutable()
    if (!claudeExe && process.platform === 'darwin' && process.arch === 'arm64') {
      throw new Error(
        'Claude Code CLI not found for darwin-arm64. Reinstall without skipping optional deps (e.g. `npm ci` or `npm install` without --omit=optional), ' +
          'or set CLAUDE_CODE_CLI_PATH / PATH_TO_CLAUDE_CODE_EXECUTABLE to your `claude` executable.',
      )
    }

    const baseOpts = {
      abortController: ac,
      cwd: process.cwd(),
      ...(claudeExe ? { pathToClaudeCodeExecutable: claudeExe } : {}),
      permissionMode: 'bypassPermissions' as const,
      allowDangerouslySkipPermissions: true,
      persistSession: false,
      settingSources: [] as const,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: body.anthropicApiKey!.trim(),
      },
      includePartialMessages: true,
      forwardSubagentText: true,
      maxTurns: runMode === 'pipeline' ? 55 : 25,
      ...(hooks ? { hooks } : {}),
      mcpServers:
        runMode === 'pipeline' || runMode === 'tools'
          ? { [MCP_SERVER_NAME]: mcpServerDef }
          : undefined,
      ...(pipelineAgents ? { agents: pipelineAgents } : {}),
      model: runMode === 'pipeline' ? orchestratorModel : runMode === 'tools' ? workerModel : singleModel,
      thinking:
        enableThinking && runMode === 'single'
          ? ({ type: 'enabled', budgetTokens: 10_000 } as const)
          : ({ type: 'disabled' } as const),
      tools: [],
      allowedTools:
        runMode === 'pipeline'
          ? ['Agent']
          : runMode === 'tools'
            ? [MCP_TOOL_PUBMED, MCP_TOOL_EXPERIMENT, MCP_TOOL_DEMO_TRAJECTORY, MCP_TOOL_VERIFY_PMIDS]
            : [],
    }

    const q = query({
      prompt: userPrompt,
      options: baseOpts,
    })

    const pipelineFeedHints = runMode === 'pipeline'

    for await (const msg of q) {
      yield* flushQueue()
      yield* handleSdkMessage(
        msg,
        signal,
        feedState,
        titlePrefixRef,
        activeSubagentPhaseRef,
        pipelineFeedHints,
        mainCapture,
        mainBufRef,
      )
    }

    yield* flushQueue()

    if (runMode === 'pipeline' && orchLsId && orchBt) {
      await endLangSmithChildRun(ls, orchLsId, { outputs: { text: mainBufRef.text } })
      orchBt.end()
      orchBt = null
    }
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

function titlePrefixToActorPhase(prefix: string): PipelinePhase | undefined {
  const p = prefix.trim()
  if (p === 'Orchestrator') return 'orchestrator'
  if (p === 'Literature review') return 'literature'
  if (p === 'Data analysis') return 'data'
  if (p === 'Hypothesis generation') return 'hypothesis'
  if (p === 'Citation audit') return 'citation'
  return undefined
}

function actorPhaseToFeedTitlePrefix(
  phase: Extract<PipelinePhase, 'literature' | 'data' | 'hypothesis' | 'citation'>,
): string {
  switch (phase) {
    case 'literature':
      return 'Literature review'
    case 'data':
      return 'Data analysis'
    case 'hypothesis':
      return 'Hypothesis generation'
    case 'citation':
      return 'Citation audit'
  }
}

function resolvePipelineStreamAttribution(
  partial: SDKPartialAssistantMessage,
  ev: SDKPartialAssistantMessage['event'],
  pipelineFeedHints: boolean,
  titlePrefixRef: { value: string },
  activeSubagentPhaseRef: { value: PipelinePhase | null },
): { prefix: string; actorPhase: PipelinePhase | undefined } {
  const delegated =
    partial.parent_tool_use_id != null &&
    activeSubagentPhaseRef.value != null &&
    activeSubagentPhaseRef.value !== 'orchestrator'
      ? activeSubagentPhaseRef.value
      : undefined

  const inferredMcp = pipelineFeedHints ? inferPipelinePhaseFromMcpStreamEvent(ev) : undefined

  let actorPhase: PipelinePhase | undefined
  if (
    delegated === 'literature' ||
    delegated === 'data' ||
    delegated === 'hypothesis' ||
    delegated === 'citation'
  ) {
    actorPhase = delegated
  } else if (inferredMcp === 'literature' || inferredMcp === 'data' || inferredMcp === 'citation') {
    actorPhase = inferredMcp
  } else {
    actorPhase = titlePrefixToActorPhase(titlePrefixRef.value)
  }

  const prefix =
    actorPhase === 'literature' ||
    actorPhase === 'data' ||
    actorPhase === 'hypothesis' ||
    actorPhase === 'citation'
      ? actorPhaseToFeedTitlePrefix(actorPhase)
      : titlePrefixRef.value

  return { prefix, actorPhase }
}

function* handleSdkMessage(
  msg: SDKMessage,
  signal: AbortSignal,
  feedState: ReturnType<typeof createBetaFeedState>,
  titlePrefixRef: { value: string },
  activeSubagentPhaseRef: { value: PipelinePhase | null },
  pipelineFeedHints: boolean,
  mainCapture: { active: boolean },
  mainBufRef: { text: string },
): Generator<StreamEvent> {
  if (msg.type === 'stream_event') {
    const partial = msg as SDKPartialAssistantMessage
    const ev = partial.event
    const { prefix, actorPhase } = resolvePipelineStreamAttribution(
      partial,
      ev,
      pipelineFeedHints,
      titlePrefixRef,
      activeSubagentPhaseRef,
    )
    yield* betaStreamEventToFeed(ev, signal, feedState, prefix, actorPhase)

    if (
      ev.type === 'content_block_delta' &&
      ev.delta.type === 'text_delta' &&
      partial.parent_tool_use_id === null &&
      mainCapture.active
    ) {
      mainBufRef.text += ev.delta.text
    }
    return
  }

  if (msg.type === 'assistant') {
    const betaMsg = (msg as { message: BetaMessage }).message
    yield* betaFinalMessageToolTail(betaMsg, feedState)
    yield* betaAssistantMessageToFeed(
      betaMsg,
      feedState,
      titlePrefixRef.value,
      titlePrefixToActorPhase(titlePrefixRef.value),
      pipelineFeedHints,
    )
    resetBetaFeedState(feedState)
    return
  }

  if (msg.type === 'result') {
    const rm = msg as SDKResultMessage
    if (rm.subtype === 'success' && typeof rm.result === 'string') {
      feedState.assembled.text = feedState.assembled.text || rm.result
    }
    return
  }
}
