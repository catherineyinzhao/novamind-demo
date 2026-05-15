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
      <details className="protocol-checklist protocol-checklist--nested">
        <summary className="protocol-checklist-summary">Fair eval vs OpenAI (talking points for the deck)</summary>
        <ul className="protocol-checklist-ul">
          <li>
            <strong>Same harness, two APIs</strong> — keep LangSmith + Braintrust; route the same orchestration prompts and transcript export shape to OpenAI and Claude paths behind a thin router.
          </li>
          <li>
            <strong>Scorers first</strong> — define pass/fail on citation_alignment, structured JSON validity, and tool_efficiency before caring about headline model Elo; compare failure modes, not single latency numbers.
          </li>
          <li>
            <strong>Latency &amp; cost</strong> — measure p50/p95 wall time and $/successful run on identical workloads; phase-level timings in this UI illustrate where time goes in one Claude Agent SDK run only.
          </li>
          <li>
            <strong>Migration</strong> — start with one vertical (e.g. hypothesis + citation audit); keep{' '}
            <strong>OpenAI (GPT‑5 / GPT‑5‑mini)</strong> or <strong>Gemini</strong> on other routes until rubrics stabilize — board gets model optionality
            without a big-bang rewrite.
          </li>
        </ul>
      </details>
      <p className="protocol-checklist-foot">
        <strong>SDK note:</strong> Extended thinking is disabled for pipeline runs in this harness; use single-stream mode to enable
        thinking on one model stream.
      </p>
    </details>
  )
}
