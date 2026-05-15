import type { ReactNode } from 'react'
import { Children, isValidElement, useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import slidesMarkdown from '../../content/leadershipSlides.md?raw'
import { MermaidDiagram } from './MermaidDiagram.tsx'

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return flattenText((node.props as { children?: ReactNode }).children)
  }
  return ''
}

type MdHeadingProps = {
  id?: string
  className?: string
  children?: ReactNode
}

function splitSlides(raw: string): string[] {
  return raw
    .trim()
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** First `##` heading in a slide chunk (for category rail); strips outer `**` pairs simply. */
function firstMarkdownH2Line(md: string): string {
  const m = md.match(/^## (.+)$/m)
  if (!m) return ''
  return m[1]
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*\*/g, '')
    .trim()
}

const slideMdComponents = {
  h1: ({ children, className }: MdHeadingProps) => (
    <h1 className={['leadership-slide-h1', className].filter(Boolean).join(' ')}>{children}</h1>
  ),
  h2: ({ children, className }: MdHeadingProps) => (
    <h2 className={['leadership-slide-h2', className].filter(Boolean).join(' ')}>{children}</h2>
  ),
  h3: ({ children, className }: MdHeadingProps) => (
    <h3 className={['leadership-slide-h3', className].filter(Boolean).join(' ')}>{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => <p className="leadership-slide-p">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="leadership-slide-ul">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="leadership-slide-ol">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="leadership-slide-li">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="leadership-slide-strong">{children}</strong>,
  em: ({ children }: { children?: ReactNode }) => <em className="leadership-slide-em">{children}</em>,
  a: ({ children, href }: { children?: ReactNode; href?: string }) => {
    const ext = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a
        className="leadership-slide-a"
        href={href}
        {...(ext ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {children}
      </a>
    )
  },
  table: ({ children }: { children?: ReactNode }) => (
    <div className="leadership-slide-table-wrap">
      <table className="leadership-slide-table">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="leadership-slide-thead">{children}</thead>,
  tbody: ({ children }: { children?: ReactNode }) => <tbody className="leadership-slide-tbody">{children}</tbody>,
  tr: ({ children }: { children?: ReactNode }) => <tr className="leadership-slide-tr">{children}</tr>,
  th: ({ children }: { children?: ReactNode }) => <th className="leadership-slide-th">{children}</th>,
  td: ({ children }: { children?: ReactNode }) => <td className="leadership-slide-td">{children}</td>,
  pre: ({ children }: { children?: ReactNode }) => {
    const arr = Children.toArray(children)
    if (arr.length === 1 && isValidElement(arr[0]) && arr[0].type === MermaidDiagram) {
      return <div className="leadership-slide-mermaid-outer">{children}</div>
    }
    return <pre className="leadership-slide-pre">{children}</pre>
  },
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    if (className?.includes('language-mermaid')) {
      const chart = flattenText(children).replace(/\n$/, '')
      return <MermaidDiagram chart={chart} />
    }
    return className ? (
      <code className={`leadership-slide-code leadership-slide-code--fenced ${className}`}>{children}</code>
    ) : (
      <code className="leadership-slide-code leadership-slide-code--inline">{children}</code>
    )
  },
}

export function LeadershipSlidesTab() {
  const slides = useMemo(() => splitSlides(slidesMarkdown), [])
  const [index, setIndex] = useState(0)
  const last = slides.length - 1

  const headingLine = useMemo(() => firstMarkdownH2Line(slides[index] ?? ''), [slides, index])

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(last, i + delta)))
    },
    [last],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      }
      if (e.key === 'Home') {
        e.preventDefault()
        setIndex(0)
      }
      if (e.key === 'End') {
        e.preventDefault()
        setIndex(last)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, last])

  const body = slides[index] ?? ''

  return (
    <div className="leadership-slides-root">
      <div className="leadership-slides-toolbar">
        <button type="button" className="leadership-slides-navbtn" disabled={index <= 0} onClick={() => go(-1)}>
          Previous
        </button>
        <span className="leadership-slides-counter">
          {index + 1} / {slides.length}
        </span>
        <button type="button" className="leadership-slides-navbtn" disabled={index >= last} onClick={() => go(1)}>
          Next
        </button>
      </div>
      <div className="leadership-slides-strip" aria-label="Slide thumbnails">
        {slides.map((_, j) => (
          <button
            key={j}
            type="button"
            className={`leadership-slides-dot ${j === index ? 'active' : ''}`}
            aria-label={`Go to slide ${j + 1}`}
            aria-current={j === index ? 'true' : undefined}
            onClick={() => setIndex(j)}
          />
        ))}
      </div>
      {headingLine ? (
        <div className="leadership-slides-headingline" aria-live="polite">
          {headingLine}
        </div>
      ) : null}
      <div className="leadership-slides-stage">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={slideMdComponents}>
          {body}
        </ReactMarkdown>
      </div>
    </div>
  )
}
