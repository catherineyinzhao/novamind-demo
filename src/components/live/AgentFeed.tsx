import type { FeedBlock } from '../../types/live'
import { stripEmojis } from '../../utils/stripEmojis'
import { StreamedMarkdown, ToolCallBody } from './StreamedMarkdown'

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
  if (blocks.length === 0 && running) {
    return (
      <div className="feed-waiting">
        <div className="feed-waiting-pulse" aria-hidden />
        <div className="feed-waiting-title">Waiting for assistant output…</div>
        <p className="feed-waiting-sub">
          LangSmith and Braintrust lines in the observability log fire first. The default <strong>research agent</strong> run issues three worker passes (literature review → data analysis → hypothesis generation); this panel updates when the first content block arrives, often a few seconds after traces initialize.
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
      </div>
    )
  }

  return (
    <>
      {blocks.map((b) => {
        const streamCursor = b.kind === 'text' && b.id === streamingTextId
        return (
          <div key={b.id} className={`agent-block ${kindClass(b.kind)}`}>
            <div className="ab-hd">
              <span className={`ab-tag ${b.kind === 'tool_result' ? 'ab-tag-astyped' : ''}`}>{tagLabel(b.kind)}</span>
              <span className="ab-title">{stripEmojis(b.title)}</span>
            </div>
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
    default:
      return 'text'
  }
}

function tagLabel(k: FeedBlock['kind']): string {
  switch (k) {
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
    default:
      return k
  }
}

