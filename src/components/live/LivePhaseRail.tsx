import type { PipelinePhase } from '../../../shared/streamProtocol.ts'

const STEPS: { phase: PipelinePhase; label: string }[] = [
  { phase: 'orchestrator', label: 'Orchestrator' },
  { phase: 'literature', label: 'Literature review' },
  { phase: 'data', label: 'Data analysis' },
  { phase: 'hypothesis', label: 'Hypothesis' },
]

export function LivePhaseRail({
  runMode,
  activePhase,
  completedPhases,
}: {
  runMode: 'pipeline' | 'single' | 'tools'
  activePhase: PipelinePhase | null
  completedPhases: Partial<Record<PipelinePhase, boolean>>
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

  return (
    <div className="live-phase-rail-wrap">
      <div className="live-phase-rail" aria-label="Pipeline phase progress">
        {STEPS.map(({ phase, label }) => {
          const done = completedPhases[phase]
          const active = activePhase === phase
          const cls = done ? 'done' : active ? 'active' : 'pending'
          return (
            <div key={phase} className={`live-phase-step live-phase-step--${cls}`}>
              <span className="live-phase-dot" aria-hidden />
              <span className="live-phase-label">{label}</span>
            </div>
          )
        })}
      </div>
      <p className="live-phase-rail-caption">
        <strong>Rail</strong> · which pipeline phase is active (orchestrator → literature → data → hypothesis).
      </p>
    </div>
  )
}
