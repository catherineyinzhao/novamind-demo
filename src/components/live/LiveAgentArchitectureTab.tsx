import type { ReactNode } from 'react'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import architectureMarkdown from '../../content/liveAgentArchitecture.md?raw'

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

const mdComponents = {
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
  p: ({ children }: { children?: ReactNode }) => <p className="leadership-pres-p">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="leadership-pres-ul">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="leadership-pres-ol">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="leadership-pres-li">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="leadership-pres-strong">{children}</strong>,
  em: ({ children }: { children?: ReactNode }) => <em className="leadership-pres-em">{children}</em>,
  hr: () => <hr className="leadership-pres-hr" />,
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
  code: ({ className, children }: { className?: string; children?: ReactNode }) =>
    className ? (
      <code className={`leadership-pres-code leadership-pres-code--fenced ${className}`}>{children}</code>
    ) : (
      <code className="leadership-pres-code leadership-pres-code--inline">{children}</code>
    ),
}

export function LiveAgentArchitectureTab() {
  const toc = useMemo(() => buildToc(architectureMarkdown), [])

  return (
    <div className="leadership-pres-root arch-guide-root">
      <div className="arch-guide-banner">
        <span className="arch-guide-banner-label">Live demo info</span>
        <span className="arch-guide-banner-text">
          How the default <strong>Live agent</strong> pipeline works — read alongside a run in the feed and phase rail.
        </span>
      </div>
      <div className="leadership-pres-layout arch-guide-layout">
        <nav className="leadership-pres-toc arch-guide-toc" aria-label="Live demo info sections">
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
        <div className="leadership-pres-article arch-guide-article">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={mdComponents}>
            {architectureMarkdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
