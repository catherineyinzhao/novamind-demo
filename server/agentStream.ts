import { APIUserAbortError } from '@anthropic-ai/sdk'
import { Client } from 'langsmith'
import { flush, initLogger, startSpan } from 'braintrust'
import type { AgentStreamRequest, StreamEvent } from '../shared/streamProtocol.ts'
import { createRootLangSmithRun } from './langsmithRootRun.ts'
import { runAgentSdkLive, type AssembledRef, type RunAgentSdkContext } from './runAgentSdkLive.ts'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

export async function* runAgentStream(
  body: AgentStreamRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const prompt = body.prompt?.trim()
  if (!prompt) throw new Error('prompt is required')
  /** Keeps Live markdown free of pictographs; the client also strips emoji when rendering. */
  const promptForModel = `${prompt}\n\nDo not use emoji or Unicode pictograph characters in your answer.`
  if (!body.anthropicApiKey?.trim()) {
    throw new Error('Anthropic API key missing: set ANTHROPIC_API_KEY in .env or paste the key in the UI')
  }
  if (!body.langsmithApiKey?.trim()) {
    throw new Error(
      'LangSmith API key missing: set LANGSMITH_API_KEY (or LANGCHAIN_API_KEY) in .env or paste in the UI',
    )
  }
  if (!body.braintrustApiKey?.trim()) {
    throw new Error('Braintrust API key missing: set BRAINTRUST_API_KEY in .env or paste in the UI')
  }

  const runMode = body.runMode ?? 'single'
  const singleModel = (body.model?.trim() || DEFAULT_MODEL).trim()
  const workerModel = (body.subagentModel?.trim() || body.model?.trim() || DEFAULT_MODEL).trim()
  const orchestratorModel = (body.orchestratorModel?.trim() || 'claude-opus-4-7').trim()

  const ls = new Client({ apiKey: body.langsmithApiKey.trim() })
  const { runId } = await createRootLangSmithRun(ls, {
    name: 'novamind-live-demo',
    run_type: 'llm',
    inputs: {
      prompt,
      runMode,
      models: {
        single: singleModel,
        worker: workerModel,
        orchestrator: runMode === 'pipeline' ? orchestratorModel : undefined,
      },
    },
    project_name: body.langsmithProjectName?.trim() || undefined,
  })

  yield { type: 'langsmith_run', runId }
  yield {
    type: 'obs',
    tone: 'lf',
    text: `langsmith: root run ${runId.slice(0, 8)}…`,
  }

  await initLogger({
    apiKey: body.braintrustApiKey.trim(),
    projectName: (body.braintrustProject || 'Global').trim(),
    orgName: body.braintrustOrg?.trim() || undefined,
    forceLogin: true,
  })

  const btSpan = startSpan({
    name: 'novamind-live-demo',
    event: {
      input: {
        prompt,
        runMode,
        singleModel,
        workerModel,
        orchestratorModel: runMode === 'pipeline' ? orchestratorModel : undefined,
      },
    },
  })
  yield {
    type: 'braintrust_span',
    spanId: btSpan.spanId,
  }
  yield {
    type: 'obs',
    tone: 'bt',
    text: `braintrust: span ${btSpan.spanId.slice(0, 8)}… · project ${(body.braintrustProject || 'Global').trim()}`,
  }

  yield {
    type: 'obs',
    tone: 'neutral',
    text: `orchestration: mode · ${runMode} · Claude Agent SDK (query)`,
  }

  const btParentExport = runMode === 'pipeline' ? await btSpan.export() : undefined

  const assembledRef: AssembledRef = { text: '' }
  const sdkCtx: RunAgentSdkContext = {
    ls,
    runId,
    btParentExport,
    langsmithProjectName: body.langsmithProjectName?.trim() || undefined,
  }

  try {
    yield* runAgentSdkLive(body, signal, promptForModel, sdkCtx, assembledRef)
    const assembledOut = assembledRef.text.trim()

    const sdkResult = assembledRef.sdkResult
    btSpan?.log({
      output: { text: assembledOut },
      metrics: {
        ...(sdkResult
          ? {
              input_tokens: sdkResult.usage.input_tokens,
              output_tokens: sdkResult.usage.output_tokens,
              cache_read_input_tokens: sdkResult.usage.cache_read_input_tokens ?? 0,
              cache_creation_input_tokens: sdkResult.usage.cache_creation_input_tokens ?? 0,
              cost_usd: sdkResult.total_cost_usd,
              duration_ms: sdkResult.duration_ms,
              duration_api_ms: sdkResult.duration_api_ms,
              num_turns: sdkResult.num_turns,
            }
          : { chars: assembledOut.length }),
      },
    })
    btSpan?.end()

    await ls.updateRun(runId, {
      outputs: {
        text: assembledOut,
        runMode,
        ...(sdkResult
          ? {
              usage: sdkResult.usage,
              model_usage: sdkResult.modelUsage,
              total_cost_usd: sdkResult.total_cost_usd,
              num_turns: sdkResult.num_turns,
              duration_ms: sdkResult.duration_ms,
              duration_api_ms: sdkResult.duration_api_ms,
            }
          : {}),
      },
      end_time: Date.now(),
    })

    yield { type: 'obs', tone: 'ok', text: 'langsmith: run completed' }

    try {
      const url = await ls.getRunUrl({ runId })
      yield { type: 'obs', tone: 'lf', text: `langsmith: ${url}` }
    } catch {
      /* optional */
    }

    const spanRef = btSpan.spanId.slice(0, 8)
    yield {
      type: 'obs',
      tone: 'lf',
      text: `langsmith: trace ${runId.slice(0, 8)}… — compare runs (TTFT, tool paths, token shape); export transcript-shaped rows for regression evals (full trajectory grading, not final string only)`,
    }
    yield {
      type: 'obs',
      tone: 'bt',
      text: `braintrust: span ${spanRef}… — attach scores & experiments; online gates pair with offline suites (signals inform the next prompt / tool / compaction change, not weights mid-request)`,
    }
    yield {
      type: 'obs',
      tone: 'neutral',
      text: 'harness loop: failed rubric rows + trace replay → prompt registry, skills bundles, and MCP tool descriptions tighten → next session behaves differently',
    }

    await flush()
    await ls.flush()

    yield { type: 'done' }
  } catch (err) {
    const aborted =
      err instanceof APIUserAbortError ||
      (typeof DOMException !== 'undefined' &&
        err instanceof DOMException &&
        err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError')

    if (aborted) {
      try {
        await ls.updateRun(runId, {
          outputs: { aborted: true },
          end_time: Date.now(),
        })
      } catch {
        /* ignore */
      }
      btSpan?.log({ metadata: { aborted: true } })
      btSpan?.end()
      try {
        await flush()
        await ls.flush()
      } catch {
        /* ignore */
      }
      yield { type: 'done', aborted: true }
      return
    }

    const msg = err instanceof Error ? err.message : String(err)
    try {
      await ls.updateRun(runId, {
        error: msg,
        end_time: Date.now(),
      })
    } catch {
      /* ignore */
    }
    btSpan?.log({ metadata: { error: msg } })
    btSpan?.end()
    try {
      await flush()
      await ls.flush()
    } catch {
      /* ignore */
    }
    yield { type: 'error', message: msg }
    yield { type: 'done' }
  }
}
