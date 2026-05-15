import type { AgentRunMode } from '../../../shared/streamProtocol.ts'

/** Compact visual map: orchestrator vs specialists vs MCP — mirrors server/researchPrompts.ts pipeline wiring. */
export function SessionTopologyStrip({
  runMode,
  variant = 'live',
}: {
  runMode: AgentRunMode
  variant?: 'live' | 'pipeline'
}) {
  if (runMode !== 'pipeline') {
    return (
      <div
        className={`session-topology session-topology--idle ${variant === 'pipeline' ? 'session-topology--pipe' : ''}`}
      >
        <span className="session-topology-note">
          {runMode === 'tools'
            ? 'Topology map: tool-loop mode uses one worker with MCP tools directly (not orchestrator → Agent specialists).'
            : 'Topology map: single-stream mode is one model session without delegated subagents.'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`session-topology ${variant === 'pipeline' ? 'session-topology--pipe' : ''}`}
      aria-label="Research agent session topology"
    >
      <div className="session-topology-hd">Session topology</div>
      <div className="session-topology-grid">
        <div className="session-topology-main">
          <span className="session-topology-node session-topology-node--orch">
            <span className="session-topology-role">Orchestrator</span>
            <span className="session-topology-meta">Agent tool only · no MCP on main thread</span>
          </span>
        </div>
        <div className="session-topology-fan" aria-hidden>
          <span className="session-topology-join" />
        </div>
        <div className="session-topology-workers">
          <div className="session-topology-node session-topology-node--worker">
            <span className="session-topology-role">Literature</span>
            <span className="session-topology-meta">MCP · ≥2 corpus queries · PMID policy</span>
          </div>
          <div className="session-topology-node session-topology-node--worker">
            <span className="session-topology-role">Data</span>
            <span className="session-topology-meta">MCP · ≥2 experiment fetches · demo trajectory SVG</span>
          </div>
          <div className="session-topology-node session-topology-node--worker">
            <span className="session-topology-role">Hypothesis</span>
            <span className="session-topology-meta">No tools · synthesis from handoffs</span>
          </div>
          <div className="session-topology-node session-topology-node--worker">
            <span className="session-topology-role">Citation</span>
            <span className="session-topology-meta">MCP · verify_claimed_pmids vs session corpus</span>
          </div>
        </div>
      </div>
      <p className="session-topology-tagline">
        Main thread · plan, risks, per-phase success bars, and{' '}
        <strong>checkpoints after literature / after data</strong> before the next delegation. Workers · multi-query literature passes and
        dual experiment summaries, trajectory chart tool, and a final PMID verification pass per protocol.
      </p>
    </div>
  )
}
