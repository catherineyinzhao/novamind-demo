import type {
  AgentRunMode,
  BraintrustChildEvent,
  LangSmithChildEvent,
  OrchestrationStep,
} from '../../../shared/streamProtocol.ts'
import { stripEmojis } from '../../utils/stripEmojis'
import { LiveRunAnatomyBar } from './LiveRunAnatomyBar'

function copyId(id: string) {
  void navigator.clipboard?.writeText(id).catch(() => {
    /* ignore */
  })
}

export function OrchestrationTimeline({
  orchSteps,
  langSmithChildren,
  braintrustChildren,
  runMode,
  model,
  workerModel,
  orchestratorModel,
  enableThinking,
}: {
  orchSteps: OrchestrationStep[]
  langSmithChildren: LangSmithChildEvent[]
  braintrustChildren: BraintrustChildEvent[]
  runMode: AgentRunMode
  model: string
  workerModel: string
  orchestratorModel: string
  enableThinking: boolean
}) {
  const hasRows =
    orchSteps.length > 0 || langSmithChildren.length > 0 || braintrustChildren.length > 0

  if (!hasRows) {
    return (
      <div className="orch-tl orch-tl-empty">
        <div className="orch-tl-hd">Traces · LangSmith · Braintrust</div>
        <p className="orch-tl-subtitle">
          <strong>Panel</strong> · copyable trace ids and export alignment — use with the phase rail (where you are) and the feed (what streamed).
        </p>
        <p className="orch-tl-lead">
          When you <strong>Run</strong> the default research agent, LangSmith child run ids and nested Braintrust spans stream here as orchestrator and worker phases execute. The bar above summarizes how the <strong>Claude Agent SDK</strong> session (<code className="orch-tl-inline-code">query()</code>) is wired before the first token.
        </p>
        <p className="orch-tl-bridge">
          Rows below follow the same phase boundaries as the <strong>phase rail</strong> and <strong>feed</strong> (orchestrator, then literature, data, hypothesis). Offline or online eval tooling can ingest{' '}
          <strong>transcript + tool I/O</strong> from those exports without a separate extraction pipeline beside the stream you already streamed.
        </p>
        <div className="orch-tl-preview">
          <LiveRunAnatomyBar
            runMode={runMode}
            model={model}
            workerModel={workerModel}
            orchestratorModel={orchestratorModel}
            enableThinking={enableThinking}
          />
        </div>
        <p className="orch-tl-wait">Waiting for first trace event…</p>
      </div>
    )
  }

  return (
    <div className="orch-tl">
      <div className="orch-tl-hd">Orchestration &amp; traces (this run)</div>
      <p className="orch-tl-subtitle">
        <strong>Panel</strong> · LangSmith child ids + Braintrust spans for offline eval exports — complements the <strong>rail</strong>{' '}
        (phase) and <strong>feed</strong> (tokens / tool blocks).
      </p>
      <p className="orch-tl-bridge">
        Rows mirror SDK turns — <code className="orch-tl-inline-code">stream_event</code> frames and subagent boundaries from{' '}
        <code className="orch-tl-inline-code">query()</code>, not a hand-rolled Messages API loop.
      </p>
      {orchSteps.length > 0 ? (
        <ul className="orch-tl-steps">
          {orchSteps.map((s) => (
            <li key={s.id} className="orch-tl-step">
              <span className="orch-tl-phase">{s.phase}</span>
              <span className="orch-tl-title">{stripEmojis(s.title)}</span>
              {s.detail ? <span className="orch-tl-detail">{stripEmojis(s.detail)}</span> : null}
              {s.model ? (
                <span className="orch-tl-model" title="Model">
                  {s.model}
                </span>
              ) : null}
              {s.langsmithChildId ? (
                <button
                  type="button"
                  className="orch-tl-copy"
                  title="Copy LangSmith id"
                  onClick={() => copyId(s.langsmithChildId!)}
                >
                  LS {s.langsmithChildId.slice(0, 8)}…
                </button>
              ) : null}
              {s.braintrustSpanName ? (
                <span className="orch-tl-bt" title="Braintrust span">
                  BT {stripEmojis(s.braintrustSpanName)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {langSmithChildren.length > 0 ? (
        <div className="orch-tl-children">
          <div className="orch-tl-subhd">LangSmith child runs</div>
          <ul>
            {langSmithChildren.map((c) => (
              <li key={c.childRunId}>
                <button
                  type="button"
                  className="orch-tl-copy"
                  title="Copy run id"
                  onClick={() => copyId(c.childRunId)}
                >
                  {c.childRunId.slice(0, 8)}…
                </button>
                <span className="orch-tl-role">{c.role}</span>
                <span className="orch-tl-cname">{stripEmojis(c.name)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {braintrustChildren.length > 0 ? (
        <div className="orch-tl-children">
          <div className="orch-tl-subhd">Braintrust nested spans</div>
          <ul>
            {braintrustChildren.map((c) => (
              <li key={`${c.spanId}-${c.name}`}>
                <button
                  type="button"
                  className="orch-tl-copy orch-tl-copy-bt"
                  title="Copy span id"
                  onClick={() => copyId(c.spanId)}
                >
                  {c.spanId.slice(0, 8)}…
                </button>
                <span className="orch-tl-cname">{stripEmojis(c.name)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
