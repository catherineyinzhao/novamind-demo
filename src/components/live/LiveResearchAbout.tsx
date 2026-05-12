import type { AgentRunMode } from '../../../shared/streamProtocol.ts'

export function LiveResearchAbout({
  runMode,
  omitSectionLabel = false,
}: {
  runMode: AgentRunMode
  /** When wrapped in a parent `<details>` summary (e.g. Live sidebar), hide the duplicate heading. */
  omitSectionLabel?: boolean
}) {
  return (
    <div className={`lp-field live-research-about${omitSectionLabel ? ' live-research-about--nested' : ''}`}>
      {omitSectionLabel ? null : <div className="lp-label">About this demo</div>}
      <p className="link-inline-note live-research-about-lede">
        The default run is a <strong>semi-autonomous research agent</strong>: the orchestrator is prompted for multiple main-thread beats
        (plan, risks, success criteria, checkpoints between phases), then workers run literature (multi-query PubMed MCP), data (dual
        experiment summaries), and hypothesis synthesis. Phase progress, tool calls, and traces stream in the <strong>main column</strong>{' '}
        after you press Run — you do not configure step order here.
      </p>
      {runMode !== 'pipeline' ? (
        <p className="link-inline-note live-research-workflow-alt" role="status">
          Alternate harness mode is active: <strong>{runMode}</strong>. Traces and the phase rail follow that mode instead of the default research sequence.
        </p>
      ) : null}
      <details className="live-research-about-details">
        <summary className="live-research-about-summary">Read more: default run shape</summary>
        <p className="link-inline-note live-research-about-honesty">
          Default pipeline runs on the server via <strong>Claude Agent SDK</strong> <code className="live-research-inline-code">query()</code> with an <strong>Agent</strong>-tool delegation protocol (orchestrator → literature → data → hypothesis). The specialist phases are implemented as SDK subagents plus an MCP server for PubMed/experiment stubs — routing is model-guided within that protocol. Full NovaMind can add richer routing; this UI streams that harness.
        </p>
        <p className="link-inline-note" style={{ marginTop: 8 }}>
          Harness limits come from Agent SDK options (e.g. <strong>maxTurns</strong>, <strong>thinking</strong> for single-stream, <strong>permissionMode</strong>) rather than hand-tuned Messages API <code className="live-research-inline-code">max_tokens</code> loops.
        </p>
        <ol className="live-research-workflow-steps">
          <li>
            <span className="live-research-workflow-k">Orchestrator</span> Planning package + checkpoints on the main thread, then{' '}
            <strong>Agent</strong> tool calls to specialists (no direct MCP on main).
          </li>
          <li>
            <span className="live-research-workflow-k">Literature</span> Multiple corpus queries; PMID-grounded synthesis.
          </li>
          <li>
            <span className="live-research-workflow-k">Data analysis</span> Multiple experiment-summary fetches across cohort slices; maps claims to evidence.
          </li>
          <li>
            <span className="live-research-workflow-k">Hypothesis</span> Merged handoffs → structured output for downstream evals.
          </li>
        </ol>
        <p className="link-inline-note" style={{ marginTop: 8 }}>
          Ingestion, agentic search, and context management show up in <strong>how the server streams</strong> tools and observability lines — not as a checklist in the sidebar.
        </p>
      </details>
      <details className="live-research-about-details">
        <summary className="live-research-about-summary">Why Claude Agent SDK (this demo)</summary>
        <ul className="live-research-sdk-bullets">
          <li>
            <strong>Same runtime as Claude Code</strong> — <code className="live-research-inline-code">@anthropic-ai/claude-agent-sdk</code>{' '}
            <code className="live-research-inline-code">query()</code> runs the managed agent loop (tools, MCP, subagents, sessions) instead of implementing your own multi-turn{' '}
            <code className="live-research-inline-code">messages.stream</code> tool loop on the Anthropic client SDK.
          </li>
          <li>
            <strong>MCP for NovaMind planes</strong> — PubMed corpus + experiment stubs are exposed as MCP tools (<code className="live-research-inline-code">novamind</code> server), matching how production wires BI/LIMS-style surfaces.
          </li>
          <li>
            <strong>Agent tool + subagents</strong> — Literature / data / hypothesis run as SDK agent definitions with scoped tool lists; the feed maps <code className="live-research-inline-code">stream_event</code> frames (including MCP tool blocks) into the same blocks you use for eval transcripts.
          </li>
          <li>
            Hooks drive <strong>LangSmith child runs</strong> and <strong>Braintrust spans</strong> at subagent boundaries so the phase rail stays aligned with trace hierarchy.
          </li>
        </ul>
      </details>
    </div>
  )
}
