import type { PipelinePhase } from '../../../shared/streamProtocol.ts'

const STEPS: { phase: PipelinePhase; label: string }[] = [
  { phase: 'orchestrator', label: 'Orchestrator' },
  { phase: 'literature', label: 'Literature review' },
  { phase: 'data', label: 'Data analysis' },
  { phase: 'hypothesis', label: 'Hypothesis' },
  { phase: 'citation', label: 'Citation audit' },
]

function formatPhaseSeconds(ms: number | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null
  return `${(ms / 1000).toFixed(1)}s`
}

export function LivePhaseRail({
  runMode,
  activePhase,
  completedPhases,
  phaseDurationsMs = {},
}: {
  runMode: 'pipeline' | 'single' | 'tools'
  activePhase: PipelinePhase | null
  completedPhases: Partial<Record<PipelinePhase, boolean>>
  /** Wall-clock duration per completed phase (this Claude run only). */
  phaseDurationsMs?: Partial<Record<PipelinePhase, number>>
}) {
  if (runMode !== 'pipeline') {
    return (
      <div className="live-phase-rail live-phase-rail--idle" aria-hidden>
        <span className="live-phase-rail-note">
          Phase rail shows progress for the default research agent only (not single-stream or tool-loop harness modes)
        </span>
      </div>
    )
  }

  const wallParts = STEPS.map(({ phase }) => {
    const sec = formatPhaseSeconds(phaseDurationsMs[phase])
    return sec ? `${phase} ${sec}` : null
  }).filter(Boolean)

  return (
    <div className="live-phase-rail-wrap">
      <div className="live-phase-rail" aria-label="Pipeline phase progress">
        {STEPS.map(({ phase, label }) => {
          const done = completedPhases[phase]
          const active = activePhase === phase
          const cls = done ? 'done' : active ? 'active' : 'pending'
          const dur = formatPhaseSeconds(phaseDurationsMs[phase])
          return (
            <div key={phase} className={`live-phase-step live-phase-step--${cls}`}>
              <span className="live-phase-dot" aria-hidden />
              <span className="live-phase-label">
                {label}
                {dur ? <span className="live-phase-duration"> · {dur}</span> : null}
              </span>
            </div>
          )
        })}
      </div>
      <p className="live-phase-rail-caption">
        <strong>Rail</strong> · orchestrator → literature → data → hypothesis → citation audit. Durations are wall time for this run
        (not comparable to other vendors without the same harness).
      </p>
      {wallParts.length > 0 ? (
        <p className="live-phase-rail-wall" aria-live="polite">
          <strong>Phase wall times</strong> · {wallParts.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
