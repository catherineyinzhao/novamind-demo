import { resolvedLinks } from '../../lib/traceUrls'
import type { ObservabilityConfig } from '../../types/observability'

export function TraceLinksCard({
  config,
  title = 'Trace links',
}: {
  config: ObservabilityConfig
  title?: string
}) {
  const { btExp, btProj, lsRun, lsProj } = resolvedLinks(config)

  return (
    <details className="live-sidebar-disclosure live-sidebar-disclosure--stacked" defaultOpen>
      <summary className="live-sidebar-disclosure-summary">{title}</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {btProj && (
          <a className="bt-link-pill" href={btProj} target="_blank" rel="noreferrer">
            Braintrust · project
          </a>
        )}
        {btExp && (
          <a className="bt-link-pill" href={btExp} target="_blank" rel="noreferrer">
            Braintrust · experiment
          </a>
        )}
        {!btProj && !btExp && (
          <span className="link-inline-note">Set org, project, and experiment id for Braintrust links.</span>
        )}
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lsProj && (
          <a className="lf-link-pill" href={lsProj} target="_blank" rel="noreferrer">
            LangSmith · project traces
          </a>
        )}
        {lsRun && (
          <a className="lf-link-pill" href={lsRun} target="_blank" rel="noreferrer">
            LangSmith · this run
          </a>
        )}
        {!lsProj && (
          <span className="link-inline-note">
            Set tenant id + project uuid for LangSmith links. Add run id when your SDK creates one.
          </span>
        )}
      </div>
    </details>
  )
}
