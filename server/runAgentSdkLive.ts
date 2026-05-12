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
import type { AgentStreamRequest, StreamEvent } from '../shared/streamProtocol.ts'
import {
  betaAssistantMessageToFeed,
  betaFinalMessageToolTail,
  betaStreamEventToFeed,
  createBetaFeedState,
  resetBetaFeedState,
} from './agentSdkBetaFeed.ts'
import { novamindMcpScriptPath, resolveClaudeCodeExecutable } from './agentSdkPaths.ts'
import { createLangSmithChildRun, endLangSmithChildRun } from './langsmithChildRun.ts'
import {
  AGENT_DATA,
  AGENT_HYPOTHESIS,
  AGENT_LITERATURE,
  buildPipelineSdkUserPrompt,
  DATA_AGENT_SYSTEM,
  HYPOTHESIS_AGENT_SYSTEM,
  LITERATURE_AGENT_SYSTEM,
  MCP_SERVER_NAME,
  MCP_TOOL_EXPERIMENT,
  MCP_TOOL_PUBMED,
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
  const feedState = createBetaFeedState(assembledRef)

  let orchLsId: string | null = null
  let litLsId: string | null = null
  let dataLsId: string | null = null
  let hypLsId: string | null = null
  let lsOrder = 2

  let orchBt: BtSpan | null = null
  let litBt: BtSpan | null = null
  let dataBt: BtSpan | null = null
  let hypBt: BtSpan | null = null

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
              tools: [MCP_TOOL_EXPERIMENT],
            },
            [AGENT_HYPOTHESIS]: {
              description: 'Structured hypotheses from literature + data handoffs (no tools).',
              prompt: HYPOTHESIS_AGENT_SYSTEM,
              model: workerModel,
              tools: [],
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

                      enqueue({ type: 'phase_end', phase: 'orchestrator' })

                      titlePrefixRef.value = 'Literature review'
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
                      enqueue({ type: 'phase_start', phase: 'literature', model: workerModel, langsmithChildId: litLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: litBt.spanId,
                        name: 'subagent.literature',
                      })
                    } else if (input.agent_type === AGENT_DATA) {
                      titlePrefixRef.value = 'Data analysis'
                      const dataLs = await createLangSmithChildRun(ls, {
                        traceId: runId,
                        parentRunId: runId,
                        name: 'subagent.data_analysis',
                        run_type: 'llm',
                        inputs: { model: workerModel, tools: ['fetch_experiment_summary'] },
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
                      enqueue({ type: 'phase_start', phase: 'data', model: workerModel, langsmithChildId: dataLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: dataBt.spanId,
                        name: 'subagent.data_analysis',
                      })
                    } else if (input.agent_type === AGENT_HYPOTHESIS) {
                      titlePrefixRef.value = 'Hypothesis generation'
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
                      enqueue({ type: 'phase_start', phase: 'hypothesis', model: workerModel, langsmithChildId: hypLsId })
                      enqueue({
                        type: 'braintrust_child',
                        spanId: hypBt.spanId,
                        name: 'subagent.hypothesis',
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
                      litBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      litBt?.end()
                      litBt = null
                      await endLangSmithChildRun(ls, litLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue({ type: 'phase_end', phase: 'literature' })
                      enqueue({
                        type: 'obs',
                        tone: 'neutral',
                        text: 'orchestration: handoff · literature synthesis → Data analysis agent (client experimental plane)',
                      })
                    } else if (input.agent_type === AGENT_DATA && dataLsId) {
                      dataBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      dataBt?.end()
                      dataBt = null
                      await endLangSmithChildRun(ls, dataLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue({ type: 'phase_end', phase: 'data' })
                      enqueue({
                        type: 'obs',
                        tone: 'neutral',
                        text: 'orchestration: handoff · literature + data memos → Hypothesis generation',
                      })
                    } else if (input.agent_type === AGENT_HYPOTHESIS && hypLsId) {
                      hypBt?.log({ output: { text: tail }, metadata: { model: workerModel } })
                      hypBt?.end()
                      hypBt = null
                      await endLangSmithChildRun(ls, hypLsId, {
                        outputs: { text: tail, model: workerModel },
                      })
                      enqueue({ type: 'phase_end', phase: 'hypothesis' })
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
      maxTurns: runMode === 'pipeline' ? 45 : 25,
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
            ? [MCP_TOOL_PUBMED, MCP_TOOL_EXPERIMENT]
            : [],
    }

    const q = query({
      prompt: userPrompt,
      options: baseOpts,
    })

    for await (const msg of q) {
      yield* flushQueue()
      yield* handleSdkMessage(msg, signal, feedState, titlePrefixRef, mainCapture, mainBufRef)
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

function* handleSdkMessage(
  msg: SDKMessage,
  signal: AbortSignal,
  feedState: ReturnType<typeof createBetaFeedState>,
  titlePrefixRef: { value: string },
  mainCapture: { active: boolean },
  mainBufRef: { text: string },
): Generator<StreamEvent> {
  if (msg.type === 'stream_event') {
    const partial = msg as SDKPartialAssistantMessage
    const ev = partial.event
    const prefix = titlePrefixRef.value
    yield* betaStreamEventToFeed(ev, signal, feedState, prefix)

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
    yield* betaAssistantMessageToFeed(betaMsg, feedState, titlePrefixRef.value)
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
