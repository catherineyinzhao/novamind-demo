import type { ReactNode } from 'react'
import { Children, isValidElement, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import leadershipMarkdown from '../../content/leadershipPresentation.md?raw'
import { MermaidDiagram } from './MermaidDiagram.tsx'
import { LeadershipSlidesTab } from './LeadershipSlidesTab.tsx'

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

function buildToc(md: string): { title: string; id: string }[] {
  const slugger = new GithubSlugger()
  const out: { title: string; id: string }[] = []
  for (const line of md.split('\n')) {
    const m = /^## (.+)\s*$/.exec(line)
    if (m) {
      const title = m[1].trim()
      out.push({ title, id: slugger.slug(title) })
    }
  }
  return out
}

const leadershipMdComponents = {
  h1: ({ children, id, className }: MdHeadingProps) => (
    <h1 id={id} className={['leadership-pres-h1', className].filter(Boolean).join(' ')}>
      {children}
    </h1>
  ),
  h2: ({ children, id, className }: MdHeadingProps) => (
    <h2 id={id} className={['leadership-pres-h2', className].filter(Boolean).join(' ')}>
      {children}
    </h2>
  ),
  h3: ({ children, id, className }: MdHeadingProps) => (
    <h3 id={id} className={['leadership-pres-h3', className].filter(Boolean).join(' ')}>
      {children}
    </h3>
  ),
  h4: ({ children, id, className }: MdHeadingProps) => (
    <h4 id={id} className={['leadership-pres-h4', className].filter(Boolean).join(' ')}>
      {children}
    </h4>
  ),
  p: ({ children }: { children?: ReactNode }) => <p className="leadership-pres-p">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="leadership-pres-ul">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="leadership-pres-ol">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="leadership-pres-li">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="leadership-pres-strong">{children}</strong>,
  em: ({ children }: { children?: ReactNode }) => <em className="leadership-pres-em">{children}</em>,
  a: ({ children, href }: { children?: ReactNode; href?: string }) => {
    const ext = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a
        className="leadership-pres-a"
        href={href}
        {...(ext ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {children}
      </a>
    )
  },
  hr: () => <hr className="leadership-pres-hr" />,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="leadership-pres-bq">{children}</blockquote>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="leadership-pres-table-wrap">
      <table className="leadership-pres-table">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="leadership-pres-thead">{children}</thead>,
  tbody: ({ children }: { children?: ReactNode }) => <tbody className="leadership-pres-tbody">{children}</tbody>,
  tr: ({ children }: { children?: ReactNode }) => <tr className="leadership-pres-tr">{children}</tr>,
  th: ({ children }: { children?: ReactNode }) => <th className="leadership-pres-th">{children}</th>,
  td: ({ children }: { children?: ReactNode }) => <td className="leadership-pres-td">{children}</td>,
  pre: ({ children }: { children?: ReactNode }) => {
    const arr = Children.toArray(children)
    if (arr.length === 1 && isValidElement(arr[0]) && arr[0].type === MermaidDiagram) {
      return <div className="leadership-pres-mermaid-outer">{children}</div>
    }
    return <pre className="leadership-pres-pre">{children}</pre>
  },
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    if (className?.includes('language-mermaid')) {
      const chart = flattenText(children).replace(/\n$/, '')
      return <MermaidDiagram chart={chart} />
    }
    return className ? (
      <code className={`leadership-pres-code leadership-pres-code--fenced ${className}`}>{children}</code>
    ) : (
      <code className="leadership-pres-code leadership-pres-code--inline">{children}</code>
    )
  },
}

export function LeadershipPresentationTab() {
  const toc = useMemo(() => buildToc(leadershipMarkdown), [])
  const [presentationView, setPresentationView] = useState<'brief' | 'slides'>('brief')

  return (
    <div className="leadership-presentation-root">
      <div className="leadership-presentation-switcher" role="tablist" aria-label="Presentation format">
        <button
          type="button"
          role="tab"
          aria-selected={presentationView === 'brief'}
          className={`leadership-presentation-switcher-btn ${presentationView === 'brief' ? 'active' : ''}`}
          onClick={() => setPresentationView('brief')}
        >
          Brief
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={presentationView === 'slides'}
          className={`leadership-presentation-switcher-btn ${presentationView === 'slides' ? 'active' : ''}`}
          onClick={() => setPresentationView('slides')}
        >
          Slides
        </button>
      </div>
      <div className="leadership-presentation-body">
        {presentationView === 'brief' ? (
          <div className="leadership-pres-root">
            <div className="leadership-pres-layout">
              <nav className="leadership-pres-toc" aria-label="Sections">
                <div className="leadership-pres-toc-title">Sections</div>
                <ol className="leadership-pres-toc-list">
                  {toc.map((item) => (
                    <li key={item.id} className="leadership-pres-toc-li">
                      <a className="leadership-pres-toc-a" href={`#${item.id}`}>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="leadership-pres-article">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={leadershipMdComponents}
                >
                  {leadershipMarkdown}
                </ReactMarkdown>
                {import.meta.env.DEV ? (
                  <div className="leadership-pres-source-card">
                    <p className="leadership-pres-source-hint">
                      Dev: markdown source{' '}
                      <code className="leadership-pres-source-code">src/content/leadershipPresentation.md</code>
                      {' — '}
                      save the file to reload.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <LeadershipSlidesTab />
        )}
      </div>
    </div>
  )
}
