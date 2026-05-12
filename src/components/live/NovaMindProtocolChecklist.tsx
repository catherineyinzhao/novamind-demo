import type { AgentRunMode } from '../../../shared/streamProtocol.ts'

/** Educational checklist aligned with buildPipelineSdkUserPrompt / specialist system prompts (prompt-enforced, not code-validated). */
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
          calls; cite only PMIDs returned by that tool.
        </li>
        <li>
          <strong>Data</strong> — at least <strong>two</strong> <code className="protocol-checklist-code">fetch_experiment_summary</code>{' '}
          calls with different cohort intent; does not query PubMed.
        </li>
        <li>
          <strong>Hypothesis</strong> has no tools; ranks using literature + data memos; citation hygiene references prior tool-returned
          PMIDs only.
        </li>
      </ul>
      <p className="protocol-checklist-foot">
        <strong>SDK note:</strong> Extended thinking is disabled for pipeline runs in this harness; use single-stream mode to enable
        thinking on one model stream.
      </p>
    </details>
  )
}
