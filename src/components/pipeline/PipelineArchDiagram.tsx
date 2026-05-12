import type { ArchState, LaneKey } from './pipelineReplayModel'
import { PipeArchFanInGraphic, PipeArchFanOutGraphic } from './PipelineArchFlowGraphics'

function laneClass(visual: ArchState[LaneKey]): string {
  let c = 'pipe-arch-node'
  if (visual === 'active') c += ' pipe-arch-node-active'
  if (visual === 'done') c += ' pipe-arch-node-done'
  return c
}

export function PipelineArchDiagram({
  arch,
  parallelLabel,
}: {
  arch: ArchState
  parallelLabel: string
}) {
  return (
    <div className="pipe-arch pipe-arch-extended" aria-label="Multi-agent architecture diagram">
      <div className="pipe-arch-row pipe-arch-row-single">
        <div className={laneClass(arch.lead)}>
          <span className="pipe-arch-role">Semi-autonomous research · Orchestrator</span>
          <span className="pipe-arch-sub">Opus-class plan · delegates literature review, data analysis, hypothesis generation · memory checkpoint</span>
        </div>
      </div>
      <div className="pipe-arch-connector pipe-arch-connector-down" aria-hidden />

      <div className="pipe-arch-row pipe-arch-row-single">
        <div className={laneClass(arch.orch)}>
          <span className="pipe-arch-role">Delegation</span>
          <span className="pipe-arch-sub">from orchestrator into Sonnet workers · bounded tool waves · trace ids per child</span>
        </div>
      </div>

      <div className="pipe-arch-connector pipe-arch-connector-down" aria-hidden />
      <div className="pipe-arch-phase-ribbon">
        <span className="pipe-arch-phase-pre">Phase</span>
        <div className="pipe-arch-badge">{parallelLabel}</div>
      </div>
      <PipeArchFanOutGraphic />

      <div className="pipe-arch-row pipe-arch-row-parallel">
        <div className={laneClass(arch.lit)}>
          <span className="pipe-arch-role">Literature review</span>
          <span className="pipe-arch-sub">Messages API · tool query_pubmed_corpus</span>
          <span className="pipe-arch-sub pipe-arch-sub-secondary">
            Stub corpus in this demo; production backs the same tool with your ingested index.
          </span>
        </div>
        <div className={laneClass(arch.exp)}>
          <span className="pipe-arch-role">Data analysis</span>
          <span className="pipe-arch-sub">Messages API · tool fetch_experiment_summary</span>
          <span className="pipe-arch-sub pipe-arch-sub-secondary">Client cohort / PDX validation (demo JSON stub).</span>
        </div>
        <div className={laneClass(arch.gov)}>
          <span className="pipe-arch-role">Citation governance</span>
          <span className="pipe-arch-sub">PMID policy · parallel with lit + data</span>
        </div>
      </div>

      <PipeArchFanInGraphic />

      <div className="pipe-arch-row pipe-arch-row-single">
        <div className={laneClass(arch.merge)}>
          <span className="pipe-arch-role">Merge + compaction</span>
          <span className="pipe-arch-sub">join transcripts · context engineering</span>
        </div>
      </div>
      <div className="pipe-arch-connector pipe-arch-connector-down" aria-hidden />

      <div className="pipe-arch-row pipe-arch-row-single">
        <div className={laneClass(arch.hyp)}>
          <span className="pipe-arch-role">Hypothesis generation</span>
          <span className="pipe-arch-sub">third specialist stage · reliable JSON · Braintrust scorers · LS export rows</span>
        </div>
      </div>
      <div className="pipe-arch-connector pipe-arch-connector-down" aria-hidden />

      <div className="pipe-arch-row pipe-arch-row-split">
        <div className={laneClass(arch.cite)}>
          <span className="pipe-arch-role">Citation agent</span>
          <span className="pipe-arch-sub">claim → source spans</span>
        </div>
        <div className={laneClass(arch.evalLoop)}>
          <span className="pipe-arch-role">Eval harness</span>
          <span className="pipe-arch-sub">LangSmith rows → Braintrust scorers → prompt registry</span>
        </div>
      </div>
    </div>
  )
}
