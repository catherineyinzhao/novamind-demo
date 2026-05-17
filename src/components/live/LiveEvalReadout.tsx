import type { PipelinePhase } from '../../../shared/streamProtocol'
import {
  citationRateLabel,
  formatWallSeconds,
  type LiveCitationEval,
  wallClockMs,
} from '../../lib/liveEvalMetrics'

function citationWarn(citation: LiveCitationEval | null): boolean {
  if (!citation || citation.total === 0) return false
  if (citation.unknownCount > 0) return true
  if (citation.rate != null && citation.rate < 0.95) return true
  return false
}

export function LiveEvalReadout({
  citation,
  phaseDurationsMs,
  elapsedMs,
  schemaViolations = 0,
  running,
}: {
  citation: LiveCitationEval | null
  phaseDurationsMs: Partial<Record<PipelinePhase, number>>
  elapsedMs: number | null
  schemaViolations?: number
  running: boolean
}) {
  const wallMs = wallClockMs(phaseDurationsMs, elapsedMs)
  const wallSec = formatWallSeconds(wallMs)
  const citeWarn = citationWarn(citation)
  const schemaWarn = schemaViolations > 0

  return (
    <div className="live-eval-readout" aria-live="polite">
      <div className="live-eval-readout-hd">
        <strong>Eval readout</strong>
        <span className="live-eval-readout-hd-sub">
          · this run{running ? ' (in progress)' : ''} — Part 2 program uses frozen rows + Braintrust
        </span>
      </div>
      <div className="live-eval-readout-row">
        <span className="live-eval-readout-label">Citation grounding</span>
        <span className="live-eval-readout-sep" aria-hidden>
          ·
        </span>
        {citation && citation.total > 0 ? (
          <>
            <span className={citeWarn ? 'live-eval-warn' : undefined}>
              {citation.admissible}/{citation.total} admissible
            </span>
            <span className="live-eval-readout-sep" aria-hidden>
              ·
            </span>
            <strong className={citeWarn ? 'live-eval-warn' : undefined}>
              {citationRateLabel(citation.rate, citation.total)}
            </strong>
          </>
        ) : (
          <span className="live-eval-readout-pending">pending citation audit</span>
        )}
      </div>
      <div className="live-eval-readout-row">
        <span className="live-eval-readout-label">Time-to-valid</span>
        <span className="live-eval-readout-sep" aria-hidden>
          ·
        </span>
        {wallSec ? (
          <strong>wall {wallSec}</strong>
        ) : (
          <span className="live-eval-readout-pending">{running ? 'timing…' : '—'}</span>
        )}
      </div>
      <div className="live-eval-readout-row">
        <span className="live-eval-readout-label">Schema violations</span>
        <span className="live-eval-readout-sep" aria-hidden>
          ·
        </span>
        <strong className={schemaWarn ? 'live-eval-warn' : undefined}>{schemaViolations}</strong>
      </div>
      <p className="live-eval-readout-foot">
        Program eval: <code className="live-eval-readout-code">fixtures@v1</code> + two Braintrust scorers in project —
        this panel reflects <strong>one</strong> traced run.
      </p>
    </div>
  )
}
