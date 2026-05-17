import {
  citationVerifySummary,
  parseCitationVerifyPayload,
} from '../../../shared/citationVerifyParse.ts'
import { tryPrettifyJsonFragment } from './StreamedMarkdown'

export function CitationVerifyCard({ body }: { body: string }) {
  const payload = parseCitationVerifyPayload(body)
  if (!payload) {
    return (
      <pre className="agent-tool-json" tabIndex={0}>
        <code>{tryPrettifyJsonFragment(body)}</code>
      </pre>
    )
  }

  const { label } = citationVerifySummary(payload)
  const allPmids = [...payload.admissible, ...payload.unknown_or_hallucinated]

  return (
    <div className="citation-verify-card">
      <div className="citation-verify-summary">
        <span className="citation-verify-summary-label">Session allowlist check</span>
        <span className="citation-verify-summary-stat">{label}</span>
      </div>
      {allPmids.length > 0 ? (
        <ul className="citation-verify-pmid-list">
          {payload.admissible.map((id) => (
            <li key={`ok-${id}`} className="citation-verify-pmid citation-verify-pmid--ok">
              <span className="citation-verify-pmid-id">{id}</span>
              <span className="citation-verify-pmid-status">admissible</span>
            </li>
          ))}
          {payload.unknown_or_hallucinated.map((id) => (
            <li key={`bad-${id}`} className="citation-verify-pmid citation-verify-pmid--bad">
              <span className="citation-verify-pmid-id">{id}</span>
              <span className="citation-verify-pmid-status">not in session corpus</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="citation-verify-empty">No PMIDs in tool response.</p>
      )}
      {payload.policy_note ? <p className="citation-verify-policy">{payload.policy_note}</p> : null}
      <details className="citation-verify-raw">
        <summary>Raw JSON</summary>
        <pre className="agent-tool-json" tabIndex={0}>
          <code>{tryPrettifyJsonFragment(body)}</code>
        </pre>
      </details>
    </div>
  )
}
