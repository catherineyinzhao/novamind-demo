function FlowArrow() {
  return (
    <span className="obs-loop-flow-arrow" aria-hidden>
      →
    </span>
  )
}

export function ObservabilityLoopCard({ langSmithRunId = '' }: { langSmithRunId?: string }) {
  const runId = langSmithRunId?.trim() ?? ''

  return (
    <div className="obs-loop-card">
      <div className="obs-loop-hd">Traces, evals, and behavior over time</div>

      <div className="obs-loop-flow" aria-label="Default research run shape in this demo">
        <span className="obs-loop-flow-step">Messages session</span>
        <FlowArrow />
        <span className="obs-loop-flow-step">LangSmith root</span>
        <FlowArrow />
        <span className="obs-loop-flow-step">orch · lit · data · hyp · cite</span>
        <FlowArrow />
        <span className="obs-loop-flow-step">Feed · tools + text</span>
        <FlowArrow />
        <span className="obs-loop-flow-step">Braintrust root + nested</span>
        <FlowArrow />
        <span className="obs-loop-flow-step">Eval · next session</span>
      </div>

      <p className="obs-loop-sdk-bridge">
        The Live harness uses <strong>@anthropic-ai/sdk</strong> and the <strong>Messages API</strong>: each <strong>tool</strong> and <strong>text</strong> block in the main feed is the same logical record LangSmith and Braintrust exports treat as dataset rows — graders read structured tool JSON and final outputs, not a parallel scrape of the UI.
      </p>

      {runId ? (
        <p className="obs-loop-runid">
          <span className="obs-loop-runid-lbl">LangSmith root run id (this tab, when streamed)</span>{' '}
          <code className="obs-loop-runid-code">{runId}</code>
        </p>
      ) : null}

      <p className="obs-loop-lede">
        <strong>Important:</strong> LangSmith and Braintrust do not change the model mid-request. Each Messages API
        session in this demo still maps to <strong>one LangSmith root run</strong> (orchestrator + child spans for{' '}
        <strong>literature review</strong>, <strong>data analysis</strong>, <strong>hypothesis generation</strong>, and <strong>citation audit</strong>) and{' '}
        <strong>Braintrust experiments</strong> (scorers on exported trajectories) for the same outputs — they record{' '}
        <em>what happened</em> (tool calls, latency, scores). The <strong>feedback loop</strong> is harness-driven: you
        inspect traces, add failing cases to an eval suite, tune prompts, PubMed ingestion heuristics, compaction, or
        internal domain packs, then redeploy — the <em>next</em> session behaves differently because the{' '}
        <strong>scaffold</strong> changed, informed by signals those systems surfaced.
      </p>

      <div className="obs-loop-where">
        <div className="obs-loop-where-h">Where you see it in this tab</div>
        <ul className="obs-loop-where-list">
          <li>
            <strong>Phase rail</strong> (top of main column) — stream-driven dots for Orchestrator → Literature review →
            Data analysis → Hypothesis → Citation audit.
          </li>
          <li>
            <strong>Orchestration &amp; traces</strong> (below <strong>Resize traces</strong>) — LangSmith child run ids,
            Braintrust span names, and orchestration steps as the server emits them.
          </li>
          <li>
            <strong>Observability log</strong> — same panel; lines starting with <code className="obs-loop-inline-code">langsmith:</code> or{' '}
            <code className="obs-loop-inline-code">braintrust:</code> mirror root/child creation.
          </li>
          <li>
            <strong>Trace links</strong> (above) — paste tenant / project / run id to open LangSmith and Braintrust for
            the same session you just streamed.
          </li>
        </ul>
      </div>

      <ul className="obs-loop-list">
        <li>
          <div className="obs-loop-maps">Maps to: literature + data + hypothesis + citation phases; LangSmith transcript + compaction between waves.</div>
          <strong>Wave-to-wave durability</strong> — Between literature and data runs, NovaMind persists merged digests,
          citation manifests, and cohort version ids so the orchestrator opens the next session on a{' '}
          <strong>checkpoint</strong>, not a blank slate. LangSmith holds the full forked transcript; only a bounded
          slice re-enters the model after compaction.
        </li>
        <li>
          <div className="obs-loop-maps">After Run: Trace links + exported rows; same root id in a Braintrust experiment.</div>
          <strong>Braintrust keyed on LangSmith exports</strong> — Export dataset rows from a root run id, attach the
          same id to a Braintrust experiment, and compare scorer trends when <strong>agentic search</strong> or retrieval
          policies change. Failures stay traceable to PubMed tool payloads or cohort joins.
        </li>
        <li>
          <div className="obs-loop-maps">Maps to: nested span scores in traces; promotion gates live outside the model.</div>
          <strong>Online scoring vs offline suites</strong> — Span-level scores and experiments complement batch
          regression: thresholds can gate promotion when live traffic drifts, while offline suites catch rewrites before
          ship.
        </li>
        <li>
          <div className="obs-loop-maps">Maps to: hypothesis phase in rail; tool JSON + text blocks in feed vs full detail in traces.</div>
          <strong>Context window vs trace store</strong> — Long trajectories assume deliberate compaction: the harness
          chooses what slice of history re-enters the model for <strong>hypothesis generation</strong>; the trace store keeps
          recoverable detail (including structured JSON and tool I/O) outside the active window.
        </li>
        <li>
          <div className="obs-loop-maps">Maps to: literature worker (PubMed tool + prompts) on the server in this harness.</div>
          <strong>Internal domain packs</strong> — Oncology and resistance SOPs ship as lean manifests first; deeper
          protocol text loads only when task classification needs it. That keeps wrong-tool spirals down in literature
          review while preserving room for client-data validation passes.
        </li>
        <li>
          <div className="obs-loop-maps">Maps to: separate LS child runs + feed blocks per phase; observability log lines per system.</div>
          <strong>Managed separation of concerns</strong> — When execution, credentials, and session logs are decoupled,
          failures surface as tool errors or replayable events instead of one opaque process; that shape scales to
          parallel Sonnet workers without coupling every sub-agent to one brittle host.
        </li>
      </ul>
    </div>
  )
}
