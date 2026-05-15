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
        experiment summaries plus a deterministic demo trajectory chart), hypothesis synthesis, and a <strong>citation audit</strong> that calls an MCP verify tool against PMIDs returned earlier in the session. Phase progress, tool calls, per-phase wall times, and traces stream in the <strong>main column</strong>{' '}
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
          Default pipeline runs on the server via <strong>Claude Agent SDK</strong> <code className="live-research-inline-code">query()</code> with an <strong>Agent</strong>-tool delegation protocol (orchestrator → literature → data → hypothesis → citation audit). The specialist phases are implemented as SDK subagents plus an MCP server for PubMed/experiment stubs — routing is model-guided within that protocol. Full NovaMind can add richer routing; this UI streams that harness.
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
          <li>
            <span className="live-research-workflow-k">Citation audit</span> <code className="live-research-inline-code">verify_claimed_pmids</code> vs session PubMed tool returns — visible tool-backed governance, not prompt-only policy.
          </li>
        </ol>
        <p className="link-inline-note" style={{ marginTop: 8 }}>
          Ingestion, agentic search, and context management show up in <strong>how the server streams</strong> tools and observability lines — not as a checklist in the sidebar.
        </p>
      </details>
      <details className="live-research-about-details">
        <summary className="live-research-about-summary">Why Agent SDK vs GPT‑5.1 / Gemini API-only paths</summary>
        <p className="link-inline-note live-research-about-honesty" style={{ marginBottom: 10 }}>
          This is an <strong>integration</strong> story, not a claim that one base model wins every benchmark. OpenAI and Google expose capable models; teams still own{' '}
          <strong>how</strong> multi-step tool use, delegation, and observability are wired. Anthropic documents the Agent SDK as the same{' '}
          <strong>tools, agent loop, and context management that power Claude Code</strong>, exposed as a library (
          <a
            className="live-research-doc-link"
            href="https://docs.anthropic.com/en/agent-sdk/overview"
            target="_blank"
            rel="noreferrer"
          >
            Agent SDK overview
          </a>
          ).
        </p>
        <ul className="live-research-sdk-bullets">
          <li>
            <strong>Managed tool loop vs hand-rolled loops</strong> — Anthropic contrasts the **client SDKs** (you send prompts and implement tool execution / the multi-turn tool cycle yourself) with the **Agent SDK**, where Claude runs that loop autonomously (
            <a className="live-research-doc-link" href="https://docs.anthropic.com/en/agent-sdk/overview" target="_blank" rel="noreferrer">
              overview: Agent SDK vs client SDK
            </a>
            ). A typical GPT‑5.1 or Gemini production stack does the same <em>by hand</em> on those vendors&apos; HTTP APIs: your service owns retries, state, and delegation wiring. For the Claude path, <code className="live-research-inline-code">query()</code> centralizes that harness so NovaMind ships less bespoke orchestration code per model route.
          </li>
          <li>
            <strong>Built-in tools + MCP</strong> — The SDK ships Claude Code-style tools (Read, Bash, Glob, Grep, WebSearch, …) and first-class{' '}
            <strong>MCP server wiring</strong> so PubMed / LIMS-style surfaces attach as protocols, not one-off HTTP wrappers in your loop (
            <a className="live-research-doc-link" href="https://docs.anthropic.com/en/agent-sdk/mcp" target="_blank" rel="noreferrer">
              MCP in Agent SDK
            </a>
            ). This demo&apos;s <code className="live-research-inline-code">novamind</code> MCP tools mirror that pattern.
          </li>
          <li>
            <strong>Subagents (Agent tool)</strong> — Specialist agents get <strong>scoped tools and prompts</strong>; messages can carry{' '}
            <code className="live-research-inline-code">parent_tool_use_id</code> so traces line up with delegations (
            <a className="live-research-doc-link" href="https://docs.anthropic.com/en/agent-sdk/subagents" target="_blank" rel="noreferrer">
              Subagents
            </a>
            ). That maps cleanly to literature vs data vs hypothesis vs citation phases and to LangSmith child runs.
          </li>
          <li>
            <strong>Hooks, permissions, sessions</strong> — Lifecycle hooks (e.g. PreToolUse / PostToolUse), tool allowlists / permission modes, and{' '}
            <strong>session resume</strong> are documented primitives — useful for audit, safety rails, and long-running research without re-implementing those layers on raw chat
            completions (
            <a className="live-research-doc-link" href="https://docs.anthropic.com/en/agent-sdk/hooks" target="_blank" rel="noreferrer">
              Hooks
            </a>
            ,{' '}
            <a className="live-research-doc-link" href="https://docs.anthropic.com/en/agent-sdk/sessions" target="_blank" rel="noreferrer">
              Sessions
            </a>
            ).
          </li>
          <li>
            <strong>Same harness your builders already trust</strong> — Many NovaMind-style teams already use Claude Code; the Agent SDK is the programmable surface of that same
            harness (per docs), so evaluation and internal playbooks transfer more directly than a greenfield custom loop per model vendor.
          </li>
        </ul>
      </details>
      <details className="live-research-about-details">
        <summary className="live-research-about-summary">What this demo wires on top of the SDK</summary>
        <ul className="live-research-sdk-bullets">
          <li>
            <strong>Server</strong> — <code className="live-research-inline-code">@anthropic-ai/claude-agent-sdk</code> <code className="live-research-inline-code">query()</code> with
            pipeline prompts, MCP stdio server, and SDK <strong>agents</strong> map (literature / data / hypothesis / citation-audit).
          </li>
          <li>
            <strong>Observability</strong> — SDK subagent hooks drive <strong>LangSmith</strong> child runs and <strong>Braintrust</strong> nested spans so the UI phase rail matches trace
            hierarchy (demo-specific; not built into the SDK itself).
          </li>
          <li>
            <strong>Feed</strong> — <code className="live-research-inline-code">stream_event</code> / tool blocks are mapped to markdown cards for eval-friendly transcripts.
          </li>
        </ul>
      </details>
    </div>
  )
}
