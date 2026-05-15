import { useMemo } from 'react'
import type { PipelinePhase } from '../../../shared/streamProtocol.ts'
import { getMcpToolInvocationHint } from '../../lib/mcpToolInvocationHint.ts'
import type { FeedBlock } from '../../types/live'
import { stripEmojis } from '../../utils/stripEmojis'
import { StreamedMarkdown, ToolCallBody } from './StreamedMarkdown'

type FeedSegment =
  | { type: 'single'; block: FeedBlock }
  | { type: 'subagent_run'; phase: Exclude<PipelinePhase, 'orchestrator'>; blocks: FeedBlock[] }
  | { type: 'orchestrator_run'; blocks: FeedBlock[] }

type DisplaySegment =
  | FeedSegment
  | {
      type: 'handoff_chain'
      delegate: FeedBlock
      subagent: { type: 'subagent_run'; phase: Exclude<PipelinePhase, 'orchestrator'>; blocks: FeedBlock[] }
    }

/** Visually links the delegate ribbon to the specialist run it opens (same stream order as Agent tool → sub-agent). */
function mergeDelegateWithFollowingSubagentRun(segments: FeedSegment[]): DisplaySegment[] {
  const out: DisplaySegment[] = []
  let i = 0
  while (i < segments.length) {
    const cur = segments[i]
    const nxt = segments[i + 1]
    if (
      cur.type === 'single' &&
      cur.block.kind === 'delegate_mark' &&
      nxt?.type === 'subagent_run'
    ) {
      out.push({ type: 'handoff_chain', delegate: cur.block, subagent: nxt })
      i += 2
      continue
    }
    out.push(cur)
    i += 1
  }
  return out
}

function segmentFeedBlocks(blocks: FeedBlock[]): FeedSegment[] {
  const out: FeedSegment[] = []
  let run: FeedBlock[] = []
  let runPhase: Exclude<PipelinePhase, 'orchestrator'> | null = null
  let orchRun: FeedBlock[] = []

  const flushSubagentRun = () => {
    if (runPhase && run.length) {
      out.push({ type: 'subagent_run', phase: runPhase, blocks: run })
    }
    run = []
    runPhase = null
  }

  const flushOrchestratorRun = () => {
    if (orchRun.length) {
      out.push({ type: 'orchestrator_run', blocks: orchRun })
      orchRun = []
    }
  }

  for (const b of blocks) {
    if (b.kind === 'phase_mark' || b.kind === 'delegate_mark') {
      flushSubagentRun()
      flushOrchestratorRun()
      out.push({ type: 'single', block: b })
      continue
    }
    const ap = 'actorPhase' in b ? b.actorPhase : undefined
    if (ap === 'literature' || ap === 'data' || ap === 'hypothesis' || ap === 'citation') {
      flushOrchestratorRun()
      if (runPhase === null) {
        runPhase = ap
        run = [b]
      } else if (ap === runPhase) {
        run.push(b)
      } else {
        flushSubagentRun()
        runPhase = ap
        run = [b]
      }
    } else {
      flushSubagentRun()
      orchRun.push(b)
    }
  }
  flushSubagentRun()
  flushOrchestratorRun()
  return out
}

function subagentRunHeading(phase: Exclude<PipelinePhase, 'orchestrator'>): string {
  switch (phase) {
    case 'literature':
      return 'Literature · sub-agent run'
    case 'data':
      return 'Data analysis · sub-agent run'
    case 'hypothesis':
      return 'Hypothesis · sub-agent run'
    case 'citation':
      return 'Citation audit · sub-agent run'
    default: {
      const _e: never = phase
      return String(_e)
    }
  }
}

function DelegateRibbon({ b }: { b: FeedBlock }) {
  if (b.kind !== 'delegate_mark') return null
  return (
    <div
      className="agent-feed-delegate-ribbon"
      role="separator"
      aria-label="Orchestrator delegates via Agent tool to a sub-agent"
    >
      <div className="agent-feed-delegate-ribbon-row">
        <span className="agent-feed-delegate-ribbon-line" aria-hidden />
        <span className="agent-feed-delegate-ribbon-cap">Delegate</span>
        <span className="agent-feed-delegate-ribbon-line" aria-hidden />
      </div>
      <div className="agent-feed-delegate-ribbon-sub">
        <span className="agent-feed-delegate-ribbon-pill">Agent tool · handoff</span>
      </div>
      <div className="agent-feed-delegate-ribbon-note thinking-md">
        <StreamedMarkdown source={b.body} />
      </div>
    </div>
  )
}

function FeedContentBlock({
  b,
  streamingTextId,
}: {
  b: FeedBlock
  streamingTextId: string | null
}) {
  if (b.kind === 'phase_mark' || b.kind === 'delegate_mark') {
    return null
  }

  const streamCursor = b.kind === 'text' && b.id === streamingTextId
  const actorCls = b.actorPhase ? `agent-block--actor-${b.actorPhase}` : ''
  const delegateCls = b.kind === 'tool' && b.isAgentDelegateTool ? 'agent-block--agent-delegate-tool' : ''
  const mcpHint =
    b.kind === 'tool' || b.kind === 'tool_result'
      ? getMcpToolInvocationHint(b.title, b.actorPhase, b.kind)
      : null
  return (
    <div key={b.id} className={`agent-block ${kindClass(b.kind)} ${actorCls} ${delegateCls}`.trim()}>
      <div className="ab-hd">
        <span className={`ab-tag ${b.kind === 'tool_result' ? 'ab-tag-astyped' : ''}`}>{tagLabelForBlock(b)}</span>
        <span className="ab-title">{stripEmojis(b.title)}</span>
      </div>
      {mcpHint ? (
        <div className="ab-tool-invoke-hint thinking-md">
          <StreamedMarkdown source={mcpHint} />
        </div>
      ) : null}
      <div className={`ab-body ${b.kind === 'thinking' ? 'thinking-md' : ''}`}>
        {b.kind === 'thinking' ? <StreamedMarkdown source={b.body} /> : null}
        {b.kind === 'tool' || b.kind === 'tool_result' ? <ToolCallBody body={b.body} /> : null}
        {b.kind === 'text' || b.kind === 'result' ? (
          <>
            <StreamedMarkdown source={b.body} />
            {streamCursor ? <span className="streaming-cursor" aria-hidden /> : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

export function AgentFeed({
  blocks,
  streamingTextId,
  running = false,
}: {
  blocks: FeedBlock[]
  streamingTextId: string | null
  /** True while the NDJSON stream is open — blocks may still be empty until Anthropic emits the first block. */
  running?: boolean
}) {
  const segments = useMemo(() => mergeDelegateWithFollowingSubagentRun(segmentFeedBlocks(blocks)), [blocks])

  if (blocks.length === 0 && running) {
    return (
      <div className="feed-waiting">
        <div className="feed-waiting-pulse" aria-hidden />
        <div className="feed-waiting-title">Waiting for assistant output…</div>
        <p className="feed-waiting-sub">
          LangSmith and Braintrust lines in the observability log fire first. In the default <strong>research agent</strong> run, watch for{' '}
          <strong>DELEGATE</strong> ribbons before each <strong>Agent tool</strong> card — those are explicit orchestrator → sub-agent handoffs. Sub-agent tool streams are grouped in a bordered run.
        </p>
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="empty">
        <div style={{ fontSize: 28, opacity: 0.15, marginBottom: 10, fontFamily: '"JetBrains Mono", monospace' }}>
          [&nbsp;]
        </div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Live Claude Agent SDK</div>
        <div style={{ fontSize: 12, color: 'var(--stone-lt)' }}>
          Streaming orchestration, tools, and traces · configure links in the sidebar
        </div>
        <div style={{ fontSize: 12, color: 'var(--stone-lt)', marginTop: 3 }}>
          Add keys, then Run — Anthropic streams via the local API; LangSmith + Braintrust log on the server.
        </div>
        <div style={{ fontSize: 12, color: 'var(--stone-lt)', marginTop: 6 }}>
          Assistant output is <strong>Markdown</strong>;{' '}
          <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>tool_use</span> inputs and demo{' '}
          <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>tool_result</span> payloads render as monospace JSON.
        </div>
        <div style={{ fontSize: 12, color: 'var(--stone-lt)', marginTop: 6 }}>
          <strong>Pipeline mode:</strong> each <strong>Agent (delegate)</strong> call is preceded by a <strong>handoff ribbon</strong>; MCP and text for each specialist sit inside a <strong>sub-agent run</strong> panel.
        </div>
      </div>
    )
  }

  return (
    <>
      {segments.map((seg, segIdx) => {
        if (seg.type === 'handoff_chain') {
          const { subagent } = seg
          return (
            <div
              key={`handoff-chain-${seg.delegate.id}-${subagent.blocks[0]?.id ?? segIdx}`}
              className={`feed-handoff-chain feed-handoff-chain--${subagent.phase}`}
            >
              <DelegateRibbon b={seg.delegate} />
              <div className="feed-handoff-chain-bridge" aria-hidden>
                <span className="feed-handoff-chain-bridge-line" />
                <span className="feed-handoff-chain-bridge-label">
                  Specialist session continues the Agent tool handoff above
                </span>
                <span className="feed-handoff-chain-bridge-line" />
              </div>
              <section
                className={`feed-subagent-run feed-subagent-run--${subagent.phase} feed-subagent-run--chained`}
                aria-label={subagentRunHeading(subagent.phase)}
              >
                <header className="feed-subagent-run-hd">
                  <div className="feed-subagent-run-hd-title">{subagentRunHeading(subagent.phase)}</div>
                  <div className="feed-subagent-run-hd-sub">
                    Tools and assistant output here run in the delegated context (not the orchestrator thread).
                  </div>
                </header>
                <div className="feed-subagent-run-body">
                  {subagent.blocks.map((b) => (
                    <FeedContentBlock key={b.id} b={b} streamingTextId={streamingTextId} />
                  ))}
                </div>
              </section>
            </div>
          )
        }

        if (seg.type === 'subagent_run') {
          return (
            <section
              key={`subagent-run-${seg.phase}-${seg.blocks[0]?.id ?? segIdx}`}
              className={`feed-subagent-run feed-subagent-run--${seg.phase}`}
              aria-label={subagentRunHeading(seg.phase)}
            >
              <header className="feed-subagent-run-hd">
                <div className="feed-subagent-run-hd-title">{subagentRunHeading(seg.phase)}</div>
              </header>
              <div className="feed-subagent-run-body">
                {seg.blocks.map((b) => (
                  <FeedContentBlock key={b.id} b={b} streamingTextId={streamingTextId} />
                ))}
              </div>
            </section>
          )
        }

        if (seg.type === 'orchestrator_run') {
          return (
            <section
              key={`orchestrator-run-${seg.blocks[0]?.id ?? segIdx}`}
              className="feed-orchestrator-run"
              aria-label="Orchestrator main thread run"
            >
              <header className="feed-orchestrator-run-hd">Orchestrator · main thread</header>
              <div className="feed-orchestrator-run-body">
                {seg.blocks.map((b) => (
                  <FeedContentBlock key={b.id} b={b} streamingTextId={streamingTextId} />
                ))}
              </div>
            </section>
          )
        }

        const b = seg.block
        if (b.kind === 'phase_mark') {
          return (
            <div
              key={b.id}
              className={`agent-block agent-block--phase-mark agent-block--mark-${b.phase}`}
              role="region"
              aria-label={b.title}
            >
              <div className="ab-phase-mark-hd">{stripEmojis(b.title)}</div>
              <div className="ab-phase-mark-body thinking-md">
                <StreamedMarkdown source={b.body} />
              </div>
            </div>
          )
        }

        if (b.kind === 'delegate_mark') {
          return <DelegateRibbon key={b.id} b={b} />
        }

        return <FeedContentBlock key={b.id} b={b} streamingTextId={streamingTextId} />
      })}
    </>
  )
}

function kindClass(k: FeedBlock['kind']): string {
  switch (k) {
    case 'thinking':
      return 'thinking'
    case 'tool':
      return 'tool'
    case 'tool_result':
      return 'tool-result'
    case 'text':
      return 'text'
    case 'result':
      return 'result'
    case 'phase_mark':
      return 'phase-mark'
    case 'delegate_mark':
      return 'delegate-mark'
    default: {
      const _x: never = k
      return String(_x)
    }
  }
}

function tagLabelForBlock(b: FeedBlock): string {
  if (b.kind === 'phase_mark') return 'phase'
  if (b.kind === 'delegate_mark') return 'handoff'
  if (b.kind === 'tool' && b.isAgentDelegateTool) return 'delegate'
  switch (b.kind) {
    case 'thinking':
      return 'think'
    case 'tool':
      return 'tool_use'
    case 'tool_result':
      return 'tool_result'
    case 'text':
      return 'text'
    case 'result':
      return 'result'
    default: {
      const _x: never = b
      return String(_x)
    }
  }
}
