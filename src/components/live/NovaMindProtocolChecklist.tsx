import type { AgentRunMode } from '../../../shared/streamProtocol.ts'

/** Educational checklist aligned with buildPipelineSdkUserPrompt / specialist system prompts (prompt-enforced; citation verify is also MCP-backed). */
export function NovaMindProtocolChecklist({ runMode }: { runMode: AgentRunMode }) {
  if (runMode !== 'pipeline') {
    return null
  }

  return (
    <details className="protocol-checklist">
      <summary className="protocol-checklist-summary">Protocol checklist · research agent</summary>
      <ul className="protocol-checklist-ul">
        <li>
          <strong>Orchestrator</strong> delegates via the <strong>Agent</strong> tool only — no direct MCP on the main thread; prompts
          ask for planning, risk register, per-phase success criteria, and{' '}
          <strong>checkpoints</strong> between delegations (prompt protocol).
        </li>
        <li>
          <strong>Literature</strong> — at least <strong>two</strong> distinct <code className="protocol-checklist-code">query_pubmed_corpus</code>{' '}
          calls; cite only PMIDs returned by that tool (MCP session records them for the citation phase).
        </li>
        <li>
          <strong>Data</strong> — at least <strong>two</strong> <code className="protocol-checklist-code">fetch_experiment_summary</code>{' '}
          calls with different cohort intent, plus one <code className="protocol-checklist-code">demo_endpoint_trajectory</code> call for a deterministic chart artifact; does not query PubMed.
        </li>
        <li>
          <strong>Hypothesis</strong> has no tools; ranks using literature + data memos; citation hygiene references prior tool-returned
          PMIDs only.
        </li>
        <li>
          <strong>Citation audit</strong> — only <code className="protocol-checklist-code">verify_claimed_pmids</code>; compares extracted PMIDs to the session allowlist from literature MCP calls (tool-backed gate, not prompt-only).
        </li>
      </ul>
      <p className="protocol-checklist-foot">
        <strong>SDK note:</strong> This pipeline runs via <code className="protocol-checklist-code">@anthropic-ai/claude-agent-sdk</code>{' '}
        <code className="protocol-checklist-code">query()</code> with SubagentStart/SubagentStop hooks, AgentDefinition per lane, and
        MCP server wiring — the same harness primitives described in the presentation. Extended thinking is disabled for pipeline runs; use
        single-stream mode to enable thinking on one model stream.
      </p>
    </details>
  )
}
