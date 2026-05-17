import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { stripEmojis } from '../../utils/stripEmojis'

const mdComponents = {
  h1: ({ children }: { children?: ReactNode }) => <h1 className="agent-md-h1">{children}</h1>,
  h2: ({ children }: { children?: ReactNode }) => <h2 className="agent-md-h2">{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 className="agent-md-h3">{children}</h3>,
  p: ({ children }: { children?: ReactNode }) => <p className="agent-md-p">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="agent-md-ul">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="agent-md-ol">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="agent-md-li">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="agent-md-strong">{children}</strong>,
  em: ({ children }: { children?: ReactNode }) => <em className="agent-md-em">{children}</em>,
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a className="agent-md-a" href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  code: ({ className, children }: { className?: string; children?: ReactNode }) =>
    className ? (
      <code className={`agent-md-fenced ${className}`}>{children}</code>
    ) : (
      <code className="agent-md-code-inline">{children}</code>
    ),
  pre: ({ children }: { children?: ReactNode }) => <pre className="agent-md-pre">{children}</pre>,
  hr: () => <hr className="agent-md-hr" />,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="agent-md-bq">{children}</blockquote>
  ),
}

/**
 * Renders assistant markdown while streaming; partial markdown may briefly look odd until closing tokens arrive.
 */
export function StreamedMarkdown({ source }: { source: string }) {
  const safe = stripEmojis(source)
  return (
    <div className="agent-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {safe}
      </ReactMarkdown>
    </div>
  )
}

export function tryPrettifyJsonFragment(body: string): string {
  const t = body.trim()
  if (!t) return body
  try {
    const parsed = JSON.parse(t)
    if (parsed !== null && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2)
    }
  } catch {
    /* streaming partial */
  }
  return body
}

function jsonIsEmptyObject(s: string): boolean {
  try {
    const parsed = JSON.parse(s)
    return (
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0
    )
  } catch {
    return false
  }
}

export function ToolCallBody({ body }: { body: string }) {
  const display = tryPrettifyJsonFragment(body)
  const trimmed = display.trim()
  if (!trimmed) {
    return (
      <pre className="agent-tool-json agent-tool-json--empty" tabIndex={0}>
        <code>(No tool arguments in this block yet.)</code>
      </pre>
    )
  }

  if (jsonIsEmptyObject(trimmed)) {
    return (
      <pre className="agent-tool-json agent-tool-json--empty" tabIndex={0}>
        <code>
          {'{}'}
          {'\n\n'}
          No arguments supplied — optional tool inputs were omitted. The demo API still runs the tool with defaults
          (e.g. optional <span className="agent-tool-inline-hint">cohort_id</span> for client data, or a default query
          for PubMed-style retrieval).
        </code>
      </pre>
    )
  }

  return (
    <pre className="agent-tool-json" tabIndex={0}>
      <code>{display}</code>
    </pre>
  )
}
