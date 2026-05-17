import { useState } from 'react'
import { langSmithRunUrl } from '../../lib/traceUrls'
import type { LangSmithRegion } from '../../types/observability'

export function LangSmithTraceChip({
  runId,
  tenantId,
  projectId,
  region = 'us',
}: {
  runId: string
  tenantId: string
  projectId: string
  region?: LangSmithRegion
}) {
  const [copied, setCopied] = useState(false)
  const url = langSmithRunUrl(tenantId, projectId, runId, region)

  const onCopy = () => {
    void navigator.clipboard?.writeText(runId).catch(() => {
      /* ignore */
    })
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="live-langsmith-chip" aria-label={`LangSmith root run ${runId}`}>
      <span className="live-langsmith-chip-label">LangSmith</span>
      <span className="live-langsmith-chip-sep" aria-hidden>
        ·
      </span>
      <code className="live-langsmith-chip-id" title={runId}>
        {runId.length > 12 ? `${runId.slice(0, 8)}…` : runId}
      </code>
      <button type="button" className="live-langsmith-chip-copy" onClick={onCopy} aria-label="Copy run id">
        {copied ? 'Copied' : 'Copy'}
      </button>
      {url ? (
        <a className="live-langsmith-chip-open" href={url} target="_blank" rel="noreferrer noopener">
          Open trace
        </a>
      ) : (
        <span className="live-langsmith-chip-hint" title="Set LangSmith tenant + project in Trace configuration">
          Configure trace links
        </span>
      )}
    </div>
  )
}
