import { useObservabilityConfig } from '../../context/useObservabilityConfig'

export function ObservabilitySettingsForm() {
  const { config, setConfig } = useObservabilityConfig()

  return (
    <details className="live-sidebar-disclosure live-sidebar-disclosure--stacked" defaultOpen>
      <summary className="live-sidebar-disclosure-summary">Trace configuration</summary>
      <div className="lp-field">
        <label className="lp-label">Braintrust org (URL slug)</label>
        <input
          className="lp-input"
          value={config.braintrustOrg}
          onChange={(e) => setConfig({ braintrustOrg: e.target.value })}
          placeholder="my-org"
          autoComplete="off"
        />
      </div>
      <div className="lp-field">
        <label className="lp-label">Braintrust project</label>
        <input
          className="lp-input"
          value={config.braintrustProject}
          onChange={(e) => setConfig({ braintrustProject: e.target.value })}
          placeholder="e.g. my-research-project"
          autoComplete="off"
        />
        <p className="link-inline-note" style={{ marginTop: 6 }}>
          No default slug is set. Enter your Braintrust project slug from the dashboard URL when you want trace links.
        </p>
      </div>
      <div className="lp-field">
        <label className="lp-label">Braintrust experiment id</label>
        <input
          className="lp-input"
          value={config.braintrustExperimentId}
          onChange={(e) => setConfig({ braintrustExperimentId: e.target.value })}
          placeholder="exp_…"
          autoComplete="off"
        />
      </div>
      <div className="lp-field">
        <label className="lp-label">LangSmith tenant id</label>
        <input
          className="lp-input"
          value={config.langSmithTenantId}
          onChange={(e) => setConfig({ langSmithTenantId: e.target.value })}
          placeholder="organization uuid"
          autoComplete="off"
        />
      </div>
      <div className="lp-field">
        <label className="lp-label">LangSmith project (name)</label>
        <input
          className="lp-input"
          value={config.langSmithProjectId}
          onChange={(e) => setConfig({ langSmithProjectId: e.target.value })}
          placeholder="matches LangSmith project name for POST /runs"
          autoComplete="off"
        />
      </div>
      <div className="lp-field">
        <label className="lp-label">LangSmith run id (optional)</label>
        <input
          className="lp-input"
          value={config.langSmithRunId}
          onChange={(e) => setConfig({ langSmithRunId: e.target.value })}
          placeholder="after POST /runs"
          autoComplete="off"
        />
      </div>
      <div className="lp-field">
        <label className="lp-label">LangSmith region</label>
        <select
          className="lp-input"
          value={config.langSmithRegion}
          onChange={(e) =>
            setConfig({ langSmithRegion: e.target.value as 'us' | 'eu' })
          }
        >
          <option value="us">US (smith.langchain.com)</option>
          <option value="eu">EU (eu.smith.langchain.com)</option>
        </select>
      </div>
      <p className="link-inline-note">
        IDs come from each dashboard URL or API responses. Experiment links require the stable{' '}
        <strong>experiment id</strong>, not the display title.
      </p>
    </details>
  )
}
