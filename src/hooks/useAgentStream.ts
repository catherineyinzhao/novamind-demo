import { useCallback, useRef, useState } from 'react'
import type {
  AgentStreamRequest,
  BraintrustChildEvent,
  LangSmithChildEvent,
  OrchestrationStep,
  PipelinePhase,
  StreamEvent,
} from '../../shared/streamProtocol.ts'
import type { FeedBlock, ObsLine } from '../types/live'
import type { LiveRunStats } from '../components/live/LiveStatsRow'

const initialStats: LiveRunStats = {
  toolBlocks: 0,
  thinkingBlocks: 0,
  obsLf: 0,
  obsBt: 0,
  langsmithChildren: 0,
  braintrustRoot: 0,
  braintrustChildren: 0,
}

function parseNdjsonChunk(buffer: string, onLine: (line: string) => void): string {
  let rest = buffer
  let nl = rest.indexOf('\n')
  while (nl >= 0) {
    const line = rest.slice(0, nl).trim()
    rest = rest.slice(nl + 1)
    if (line) onLine(line)
    nl = rest.indexOf('\n')
  }
  return rest
}

function completeResultMarkdown(langSmithRunId: string | null): string {
  const idLine = langSmithRunId
    ? `**LangSmith root run id:** \`${langSmithRunId}\` — open **LangSmith · this run** in the sidebar (id is synced from this stream) to see child runs per phase, inputs/outputs, and latency.`
    : `**LangSmith:** The root run id was logged at the start of the observability panel as \`langsmith: root run …\`; paste the full id into **Trace links** if the sidebar button is still empty.`

  return `### Where the “eval” detail is

This app **records** LangSmith runs and Braintrust spans; it does **not** compute rubric scores or pass/fail in the feed. Numeric evals and comparisons happen in **LangSmith / Braintrust** (or exported rows), not inside this demo UI.

${idLine}

- **Braintrust:** Nested spans were flushed under the session root. Use **Trace links** → project / experiment to attach scorers or view span trees.
- **Already in this tab:** Hypothesis and worker text in the feed, **tool_use** / **tool_result** JSON, **Orchestration & traces** (copyable child ids), and the observability log lines above.

For regression-style work, export **transcript-shaped** rows from the LangSmith run and pair them with Braintrust experiments keyed on the same session.`
}

/** Claude / Anthropic capacity errors often arrive as assistant text, not `StreamEvent.type === 'error'`. */
function looksLikeApiOverloadAssistantText(body: string): boolean {
  return (
    /\b529\b/.test(body) &&
    /overload|at capacity|capacity|try again|status\.claude\.com/i.test(body)
  )
}

/** Synthetic feed row when a pipeline phase starts — makes orchestrator vs sub-agents obvious in the main column. */
function phaseMarkBlock(evt: {
  phase: PipelinePhase
  model?: string
  langsmithChildId?: string
}): FeedBlock {
  const { phase, model, langsmithChildId } = evt
  const modelLine = model ? `**Model:** \`${model}\`` : ''
  const lsLine = langsmithChildId
    ? `**LangSmith child:** \`${langsmithChildId.slice(0, 12)}…\` — full id in **Orchestration & traces**`
    : ''
  const tail = [modelLine, lsLine].filter(Boolean).join('\n\n')

  switch (phase) {
    case 'orchestrator':
      return {
        id: crypto.randomUUID(),
        kind: 'phase_mark',
        phase,
        title: 'Orchestrator · main thread',
        body: [
          '**Main thread** — planning, checkpoints, then **Agent** tool calls only (no MCP here); each **Agent (delegate)** card below is an explicit handoff.',
          tail,
        ]
            .filter(Boolean)
            .join('\n\n'),
        model,
        langsmithChildId,
      }
    case 'literature':
      return {
        id: crypto.randomUUID(),
        kind: 'phase_mark',
        phase,
        title: 'Sub-agent · Literature review',
        body: [
          '**Delegated** from orchestrator · **Isolated context** · MCP tools: `query_pubmed_corpus` only (PubMed plane).',
          tail,
        ]
          .filter(Boolean)
          .join('\n\n'),
        model,
        langsmithChildId,
      }
    case 'data':
      return {
        id: crypto.randomUUID(),
        kind: 'phase_mark',
        phase,
        title: 'Sub-agent · Data analysis',
        body: [
          '**Delegated** from orchestrator · **Isolated context** · MCP tools: `fetch_experiment_summary` and `demo_endpoint_trajectory` (cohort metrics + deterministic demo chart). Each **TOOL_USE** row below is **model-emitted** inside this sub-agent (Agent SDK loop), not a control you clicked in the UI.',
          tail,
        ]
          .filter(Boolean)
          .join('\n\n'),
        model,
        langsmithChildId,
      }
    case 'hypothesis':
      return {
        id: crypto.randomUUID(),
        kind: 'phase_mark',
        phase,
        title: 'Sub-agent · Hypothesis generation',
        body: [
          '**Delegated** from orchestrator · **Isolated context** · **No tools** — ranks hypotheses from literature + data handoffs and checkpoints.',
          tail,
        ]
          .filter(Boolean)
          .join('\n\n'),
        model,
        langsmithChildId,
      }
    case 'citation':
      return {
        id: crypto.randomUUID(),
        kind: 'phase_mark',
        phase,
        title: 'Sub-agent · Citation audit',
        body: [
          '**Delegated** from orchestrator · **Isolated context** · MCP tool **verify_claimed_pmids** only — compares extracted PMIDs to this session’s PubMed tool returns.',
          tail,
        ]
          .filter(Boolean)
          .join('\n\n'),
        model,
        langsmithChildId,
      }
  }
}

function delegateMarkBlock(linkedToolId: string): FeedBlock {
  return {
    id: `delegate-${linkedToolId}`,
    kind: 'delegate_mark',
    title: 'Handoff',
    body:
      '**Orchestrator → Agent tool** → sub-agent run (**new** context).\n\nInspect the JSON for `subagent_type`.',
  }
}

export function useAgentStream({
  onObsLine,
  onLangSmithRunId,
}: {
  onObsLine?: (line: ObsLine) => void
  onLangSmithRunId?: (runId: string) => void
} = {}) {
  const [blocks, setBlocks] = useState<FeedBlock[]>([])
  const [orchSteps, setOrchSteps] = useState<OrchestrationStep[]>([])
  const [langSmithChildren, setLangSmithChildren] = useState<LangSmithChildEvent[]>([])
  const [braintrustChildren, setBraintrustChildren] = useState<BraintrustChildEvent[]>([])
  const [activePhase, setActivePhase] = useState<PipelinePhase | null>(null)
  const [completedPhases, setCompletedPhases] = useState<Partial<Record<PipelinePhase, boolean>>>({})
  const [phaseDurationsMs, setPhaseDurationsMs] = useState<Partial<Record<PipelinePhase, number>>>({})
  const [liveStats, setLiveStats] = useState<LiveRunStats>(initialStats)
  const [streamingTextId, setStreamingTextId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  /** Set when the server emits `langsmith_run` — used to make the final Complete card concrete. */
  const langSmithRunIdRef = useRef<string | null>(null)
  /** Mirrors `activePhase` synchronously for NDJSON handling (React state lags within the same tick). */
  const activePhaseRef = useRef<PipelinePhase | null>(null)

  const appendObs = useCallback(
    (text: string, tone: ObsLine['tone'] = 'neutral') => {
      onObsLine?.({ id: crypto.randomUUID(), text, tone })
    },
    [onObsLine],
  )

  const run = useCallback(
    async (payload: AgentStreamRequest) => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setRunning(true)
      setBlocks([])
      setOrchSteps([])
      setLangSmithChildren([])
      setBraintrustChildren([])
      setActivePhase(null)
      setCompletedPhases({})
      setPhaseDurationsMs({})
      setLiveStats(initialStats)
      setStreamingTextId(null)
      langSmithRunIdRef.current = null
      activePhaseRef.current = null

      try {
        const res = await fetch('/api/agent/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ac.signal,
        })

        if (!res.ok) {
          const t = await res.text()
          throw new Error(t || `HTTP ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const dec = new TextDecoder()
        let buf = ''

        const handleEvent = (evt: StreamEvent) => {
          switch (evt.type) {
            case 'langsmith_run':
              langSmithRunIdRef.current = evt.runId
              onLangSmithRunId?.(evt.runId)
              break
            case 'braintrust_span':
              appendObs(`braintrust: span ${evt.spanId.slice(0, 12)}…`, 'bt')
              setLiveStats((s) => ({ ...s, braintrustRoot: s.braintrustRoot + 1 }))
              break
            case 'braintrust_child':
              setBraintrustChildren((rows) => [...rows, evt])
              setLiveStats((s) => ({ ...s, braintrustChildren: s.braintrustChildren + 1 }))
              break
            case 'orch_step':
              setOrchSteps((rows) => [...rows, evt])
              break
            case 'langsmith_child':
              setLangSmithChildren((rows) => [...rows, evt])
              setLiveStats((s) => ({ ...s, langsmithChildren: s.langsmithChildren + 1 }))
              break
            case 'phase_start':
              activePhaseRef.current = evt.phase
              setActivePhase(evt.phase)
              setBlocks((b) => [...b, phaseMarkBlock(evt)])
              break
            case 'phase_end':
              setCompletedPhases((prev) => ({ ...prev, [evt.phase]: true }))
              if (evt.durationMs != null) {
                setPhaseDurationsMs((prev) => ({ ...prev, [evt.phase]: evt.durationMs! }))
              }
              activePhaseRef.current = null
              setActivePhase(null)
              break
            case 'obs':
              appendObs(evt.text, evt.tone)
              if (evt.tone === 'lf') {
                setLiveStats((s) => ({ ...s, obsLf: s.obsLf + 1 }))
              } else if (evt.tone === 'bt') {
                setLiveStats((s) => ({ ...s, obsBt: s.obsBt + 1 }))
              }
              break
            case 'block_start': {
              if (evt.blockKind === 'tool' || evt.blockKind === 'tool_result') {
                setLiveStats((s) => ({ ...s, toolBlocks: s.toolBlocks + 1 }))
              } else if (evt.blockKind === 'thinking') {
                setLiveStats((s) => ({ ...s, thinkingBlocks: s.thinkingBlocks + 1 }))
              }
              const isAgentDelegate =
                evt.blockKind === 'tool' && evt.title.includes('Agent (delegate)')
              const pipeline = payload.runMode === 'pipeline'
              const refPhase = activePhaseRef.current
              const stampFromActive =
                pipeline &&
                evt.actorPhase === undefined &&
                refPhase != null &&
                refPhase !== 'orchestrator' &&
                !isAgentDelegate
              const actorPhase = evt.actorPhase ?? (stampFromActive ? refPhase : undefined)
              setBlocks((prev) => {
                const next: FeedBlock[] = [...prev]
                if (isAgentDelegate) {
                  next.push(delegateMarkBlock(evt.id))
                }
                if (evt.blockKind === 'tool') {
                  next.push({
                    id: evt.id,
                    kind: 'tool',
                    title: evt.title,
                    body: '',
                    ...(actorPhase ? { actorPhase } : {}),
                    ...(isAgentDelegate ? { isAgentDelegateTool: true } : {}),
                  })
                } else {
                  next.push({
                    id: evt.id,
                    kind: evt.blockKind,
                    title: evt.title,
                    body: '',
                    ...(actorPhase ? { actorPhase } : {}),
                  })
                }
                return next
              })
              if (evt.blockKind === 'text') setStreamingTextId(evt.id)
              break
            }
            case 'block_delta':
              setBlocks((prev) => {
                const prevBlk = prev.find((x) => x.id === evt.id)
                const prevOverload =
                  prevBlk?.kind === 'text' && looksLikeApiOverloadAssistantText(prevBlk.body)
                const next = prev.map((x) =>
                  x.id === evt.id ? { ...x, body: x.body + evt.text } : x,
                )
                const blk = next.find((x) => x.id === evt.id)
                const nowOverload =
                  blk?.kind === 'text' && looksLikeApiOverloadAssistantText(blk.body)
                if (nowOverload && !prevOverload) {
                  setStreamingTextId(null)
                  appendObs(
                    'API reported overload (529-class) in stream — try again shortly or Stop if the session is stuck.',
                    'err',
                  )
                }
                return next
              })
              break
            case 'error': {
              const stopped =
                evt.message === 'Request was aborted.' ||
                evt.message.toLowerCase().includes('user aborted')
              setStreamingTextId(null)
              if (!stopped) {
                setRunning(false)
                setBlocks((b) => [
                  ...b,
                  {
                    id: crypto.randomUUID(),
                    kind: 'result',
                    title: 'Error',
                    body: evt.message,
                  },
                ])
              }
              if (!stopped) appendObs(evt.message, 'err')
              break
            }
            case 'done':
              setStreamingTextId(null)
              setRunning(false)
              setBlocks((b) => {
                if (
                  b.some(
                    (x) =>
                      x.kind === 'result' && (x.title === 'Error' || x.title === 'Stopped'),
                  )
                )
                  return b
                if (evt.aborted) {
                  return b
                }
                return [
                  ...b,
                  {
                    id: crypto.randomUUID(),
                    kind: 'result',
                    title: 'Complete',
                    body: completeResultMarkdown(langSmithRunIdRef.current),
                  },
                ]
              })
              break
            default:
              break
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          buf = parseNdjsonChunk(buf, (line) => {
            try {
              const evt = JSON.parse(line) as StreamEvent
              handleEvent(evt)
            } catch {
              appendObs(`parse error: ${line.slice(0, 80)}`, 'err')
            }
          })
        }

        if (buf.trim()) {
          try {
            const evt = JSON.parse(buf.trim()) as StreamEvent
            handleEvent(evt)
          } catch {
            /* ignore trailing garbage */
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          const msg = e instanceof Error ? e.message : String(e)
          appendObs(msg, 'err')
          setBlocks((b) => [
            ...b,
            {
              id: crypto.randomUUID(),
              kind: 'result',
              title: 'Error',
              body: msg,
            },
          ])
        }
      } finally {
        setRunning(false)
        setStreamingTextId(null)
        setActivePhase(null)
        abortRef.current = null
      }
    },
    [appendObs, onLangSmithRunId],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    blocks,
    orchSteps,
    langSmithChildren,
    braintrustChildren,
    activePhase,
    completedPhases,
    phaseDurationsMs,
    liveStats,
    streamingTextId,
    running,
    run,
    stop,
  }
}
