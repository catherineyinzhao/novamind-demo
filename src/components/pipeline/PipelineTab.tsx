import { useMemo, useRef, useState } from 'react'
import { StreamedMarkdown } from '../live/StreamedMarkdown'
import { PipelineArchDiagram } from './PipelineArchDiagram'
import { SessionTopologyStrip } from '../live/SessionTopologyStrip'
import { usePipelineReplay } from './usePipelineReplay'
import type { FeedEntry, PipelineState, TreeNode } from './pipelineReplayModel'

function tagForType(t: TreeNode['type']): string {
  switch (t) {
    case 'lead':
      return 'LEAD'
    case 'mem':
      return 'MEM'
    case 'orch':
      return 'orch'
    case 'lit':
      return 'LIT'
    case 'exp':
      return 'EXP'
    case 'gov':
      return 'GOV'
    case 'merge':
      return 'MRG'
    case 'hyp':
      return 'HYP'
    case 'cite':
      return 'CITE'
    case 'eval':
      return 'EVAL'
    default:
      return t
  }
}

function rowClass(n: TreeNode): string {
  const base = 'pipe-tree-row'
  if (n.status === 'run') return `${base} pipe-tree-run`
  if (n.status === 'ok') return `${base} pipe-tree-ok`
  if (n.status === 'rej') return `${base} pipe-tree-rej`
  return base
}

function tagColor(t: TreeNode['type']): string {
  switch (t) {
    case 'lead':
      return 'var(--ink)'
    case 'mem':
      return 'var(--stone)'
    case 'orch':
      return 'var(--stone)'
    case 'lit':
      return 'var(--terra)'
    case 'exp':
      return 'var(--blue)'
    case 'gov':
      return 'var(--green)'
    case 'merge':
      return 'var(--purple)'
    case 'hyp':
      return 'var(--amber)'
    case 'cite':
      return '#2d6a4f'
    case 'eval':
      return '#7c3aed'
    default:
      return 'var(--stone)'
  }
}

function blockClass(v: FeedEntry['variant']): string {
  switch (v) {
    case 'orch':
      return 'agent-block text'
    case 'tool':
      return 'agent-block tool'
    case 'think':
      return 'agent-block thinking'
    case 'hyp':
      return 'agent-block result'
    case 'compact':
      return 'agent-block pipe-block-compact'
    case 'eval':
      return 'agent-block pipe-block-eval'
    default:
      return 'agent-block text'
  }
}

function tagForFeed(v: FeedEntry['variant']): string {
  switch (v) {
    case 'orch':
      return 'orch'
    case 'tool':
      return 'tool'
    case 'think':
      return 'think'
    case 'hyp':
      return 'result'
    case 'compact':
      return 'ctx'
    case 'eval':
      return 'eval'
    default:
      return 'text'
  }
}

const PHASE_COPY: Record<PipelineState['parallelPhase'], string> = {
  idle: 'Architecture idle · press Play',
  lead: 'Semi-autonomous research agent · orchestrator plan + delegate',
  fanout: 'LangSmith child runs queued · Braintrust nested span template',
  parallel: 'Sonnet sub-agents · literature review + data analysis + citation governance',
  merge: 'Merge + compaction · 100K+ context discipline',
  hypothesis: 'Hypothesis generation · structured JSON · PMID policy',
  citation: 'Citation agent · claim → source spans',
  eval_feedback: 'Braintrust eval · LangSmith trajectory rows + scorers',
  obs_export: 'LangSmith dataset rows + Braintrust scored spans → next ship',
  done: 'Wave complete · eval gates informed next session',
}

function feedBodyPre(variant: FeedEntry['variant']): boolean {
  return variant === 'tool' || variant === 'hyp' || variant === 'eval'
}

const PIPE_TREE_LS_KEY = 'novamind-pipe-tree-px'
const PIPE_TREE_DEFAULT = 200
const PIPE_TREE_MIN = 140
const PIPE_TREE_MAX = 480

const PIPE_RP_LS_KEY = 'novamind-pipe-rp-px'
const PIPE_RP_DEFAULT = 280
const PIPE_RP_MIN = 220
const PIPE_RP_MAX = 560

function readPipeTreeWidth(): number {
  try {
    const raw = localStorage.getItem(PIPE_TREE_LS_KEY)
    const v = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(v)) return PIPE_TREE_DEFAULT
    return Math.min(PIPE_TREE_MAX, Math.max(PIPE_TREE_MIN, v))
  } catch {
    return PIPE_TREE_DEFAULT
  }
}

function readPipeRpWidth(): number {
  try {
    const raw = localStorage.getItem(PIPE_RP_LS_KEY)
    const v = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(v)) return PIPE_RP_DEFAULT
    return Math.min(PIPE_RP_MAX, Math.max(PIPE_RP_MIN, v))
  } catch {
    return PIPE_RP_DEFAULT
  }
}

export function PipelineTab() {
  const { state, playing, play, reset } = usePipelineReplay()
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [rpCollapsed, setRpCollapsed] = useState(false)
  const [archExpanded, setArchExpanded] = useState(true)

  const pipeTreeWRef = useRef(readPipeTreeWidth())
  const [pipeTreePx, setPipeTreePx] = useState(readPipeTreeWidth)
  const pipeRpWRef = useRef(readPipeRpWidth())
  const [pipeRpPx, setPipeRpPx] = useState(readPipeRpWidth)
  const treePipeDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const rpPipeDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const [pipeDragging, setPipeDragging] = useState(false)

  const gridTemplateColumns = useMemo(() => {
    if (treeCollapsed && rpCollapsed) return '40px minmax(0, 1fr) 44px'
    if (treeCollapsed && !rpCollapsed) return `40px minmax(0, 1fr) 10px ${pipeRpPx}px`
    if (!treeCollapsed && rpCollapsed) return `${pipeTreePx}px 10px minmax(0, 1fr) 44px`
    return `${pipeTreePx}px 10px minmax(0, 1fr) 10px ${pipeRpPx}px`
  }, [treeCollapsed, rpCollapsed, pipeTreePx, pipeRpPx])

  const onTreePipePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    treePipeDragRef.current = { startX: e.clientX, startW: pipeTreeWRef.current }
    setPipeDragging(true)
  }
  const onTreePipePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = treePipeDragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const next = Math.min(PIPE_TREE_MAX, Math.max(PIPE_TREE_MIN, d.startW + dx))
    if (next !== pipeTreeWRef.current) {
      pipeTreeWRef.current = next
      setPipeTreePx(next)
    }
  }
  const endTreePipeDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    treePipeDragRef.current = null
    setPipeDragging(false)
    try {
      localStorage.setItem(PIPE_TREE_LS_KEY, String(pipeTreeWRef.current))
    } catch {
      /* ignore */
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }
  const onTreePipeDoubleClick = () => {
    pipeTreeWRef.current = PIPE_TREE_DEFAULT
    setPipeTreePx(PIPE_TREE_DEFAULT)
    try {
      localStorage.setItem(PIPE_TREE_LS_KEY, String(PIPE_TREE_DEFAULT))
    } catch {
      /* ignore */
    }
  }

  const onRpPipePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    rpPipeDragRef.current = { startX: e.clientX, startW: pipeRpWRef.current }
    setPipeDragging(true)
  }
  const onRpPipePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = rpPipeDragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const next = Math.min(PIPE_RP_MAX, Math.max(PIPE_RP_MIN, d.startW + dx))
    if (next !== pipeRpWRef.current) {
      pipeRpWRef.current = next
      setPipeRpPx(next)
    }
  }
  const endRpPipeDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    rpPipeDragRef.current = null
    setPipeDragging(false)
    try {
      localStorage.setItem(PIPE_RP_LS_KEY, String(pipeRpWRef.current))
    } catch {
      /* ignore */
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }
  const onRpPipeDoubleClick = () => {
    pipeRpWRef.current = PIPE_RP_DEFAULT
    setPipeRpPx(PIPE_RP_DEFAULT)
    try {
      localStorage.setItem(PIPE_RP_LS_KEY, String(PIPE_RP_DEFAULT))
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`pipe-page ${treeCollapsed ? 'pipe-page--tree-collapsed' : ''} ${rpCollapsed ? 'pipe-page--rp-collapsed' : ''} ${pipeDragging ? 'pipe-page--pipe-dragging' : ''}`}
      style={{ gridTemplateColumns }}
    >
      <aside className={`sidebar ${treeCollapsed ? 'sidebar--collapsed' : ''}`}>
        {treeCollapsed ? (
          <button
            type="button"
            className="pipe-strip-expand"
            onClick={() => setTreeCollapsed(false)}
            aria-expanded={false}
            aria-controls="pipe-tree-panel"
            title="Expand span tree"
          >
            Span tree
          </button>
        ) : (
          <>
            <div className="sb-head sb-head--row">
              <span>Span tree</span>
              <button
                type="button"
                className="pipe-panel-toggle"
                onClick={() => setTreeCollapsed(true)}
                aria-expanded={!treeCollapsed}
                aria-controls="pipe-tree-panel"
              >
                Hide
              </button>
            </div>
            <div id="pipe-tree-panel" className="sb-scroll">
              {state.tree.length === 0 ? (
                <p className="link-inline-note" style={{ padding: '10px 13px' }}>
                  Press <strong>Play</strong> for a semi-autonomous research orchestrator, parallel Sonnet workers (literature
                  review, data analysis, citation governance), merge + compaction, hypothesis generation as structured JSON, a
                  citation pass, Braintrust eval on exported traces, and LangSmith / Braintrust export narrative.
                </p>
              ) : (
                state.tree.map((n) => (
                  <div key={n.id} className={rowClass(n)}>
                    <span className="pipe-dot" />
                    <span
                      className="pipe-tag"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 9,
                        color: tagColor(n.type),
                      }}
                    >
                      {tagForType(n.type)}
                    </span>
                    <span style={{ flex: 1, color: 'var(--ink)' }}>{n.label}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>
      {!treeCollapsed ? (
        <button
          type="button"
          className="pipe-page-vsplit"
          aria-orientation="vertical"
          aria-label="Drag to resize span tree column. Double-click to reset width."
          title="Drag to resize span tree. Double-click to reset."
          onPointerDown={onTreePipePointerDown}
          onPointerMove={onTreePipePointerMove}
          onPointerUp={endTreePipeDrag}
          onPointerCancel={endTreePipeDrag}
          onDoubleClick={onTreePipeDoubleClick}
        />
      ) : null}
      <div className="feed-wrap">
        <div className="pipe-scenario">
          <div className="pipe-scenario-h">Agent architecture</div>
          <div className="pipe-scenario-md">
            <StreamedMarkdown source={state.scenarioHook} />
          </div>
        </div>

        <SessionTopologyStrip runMode="pipeline" variant="pipeline" />

        <div className="pipe-arch-shell">
          <button
            type="button"
            className="pipe-arch-toggle"
            onClick={() => setArchExpanded((v) => !v)}
            aria-expanded={archExpanded}
            aria-controls="pipe-arch-panel"
          >
            <span className="pipe-arch-toggle-label">Architecture</span>
            <span className="pipe-arch-toggle-phase">{PHASE_COPY[state.parallelPhase]}</span>
            <span className="pipe-arch-toggle-chevron" aria-hidden>
              {archExpanded ? '-' : '+'}
            </span>
          </button>
          {archExpanded ? (
            <div id="pipe-arch-panel">
              <PipelineArchDiagram arch={state.arch} parallelLabel={PHASE_COPY[state.parallelPhase]} />
            </div>
          ) : null}
        </div>

        <div className="pipe-sdk-note" role="note">
          <strong>Replay vs Live:</strong> This <strong>Pipeline</strong> tab is a <strong>scripted replay</strong> with extra narrative lanes (e.g. citation governance, merge) that sketch a fuller NovaMind-shaped system. The <strong>Live</strong> tab is the real wire path:{' '}
          <strong>Claude Agent SDK</strong> <code className="pipe-sdk-note-code">query()</code> with <strong>MCP</strong> for{' '}
          <code className="pipe-sdk-note-code">query_pubmed_corpus</code> and <code className="pipe-sdk-note-code">fetch_experiment_summary</code>, plus <strong>Agent</strong>-tool subagents and hooks for LangSmith / Braintrust. Feed blocks map SDK{' '}
          <code className="pipe-sdk-note-code">stream_event</code> output; stub payloads still come from <code className="pipe-sdk-note-code">executeDemoTool</code> (<code className="pipe-sdk-note-code">server/demoTools.ts</code>). The parallel{' '}
          <strong>citation governance</strong> lane here is story breadth — the Live harness folds PMID policy into prompts and the hypothesis phase instead of a separate parallel worker.
        </div>

        <div className="pipe-toolbar">
          <button type="button" className="tab-btn primary" disabled={playing} onClick={play}>
            Play
          </button>
          <button type="button" className="tab-btn" disabled={playing} onClick={reset}>
            Reset
          </button>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--stone)' }}>
            {playing ? 'Replaying scripted DAG…' : 'Scripted replay · no API · agent-harness patterns'}
          </span>
        </div>
        <div className="feed">
          {state.feed.length === 0 && !playing ? (
            <div className="empty">
              <div className="pipe-empty-mark" aria-hidden />
              <div style={{ fontSize: 14, marginBottom: 4 }}>Orchestrator → workers → merge → evals</div>
              <div style={{ fontSize: 12, color: 'var(--stone-lt)', maxWidth: 460, margin: '0 auto' }}>
                Models: <strong>Opus-class</strong> plan + <strong>Sonnet-class</strong> execution. Requirements echoed here: heavy{' '}
                <strong>tool calling</strong> + <strong>structured JSON</strong>, <strong>100K+</strong>-class context budgeting,{' '}
                <strong>zero hallucinated citations</strong>. LangSmith trace tree + Braintrust scorers → offline/online eval loops
                that gate the <em>next</em> deploy.
              </div>
            </div>
          ) : state.feed.length === 0 && playing ? (
            <div className="empty">
              <p className="link-inline-note">Starting replay…</p>
            </div>
          ) : (
            state.feed.map((f) => (
              <div key={f.id} className={blockClass(f.variant)}>
                <div className="ab-hd">
                  <span className="ab-tag">{tagForFeed(f.variant)}</span>
                <div className="ab-title pipe-ab-title-md">
                  <StreamedMarkdown source={f.title} />
                </div>
                </div>
                {f.body ? (
                  <div
                    className={`ab-body pipe-feed-md ${f.variant === 'think' ? 'thinking-text thinking-md' : ''}`}
                  >
                    {feedBodyPre(f.variant) ? (
                      <div className="tool-call-pre">{f.body}</div>
                    ) : (
                      <StreamedMarkdown source={f.body} />
                    )}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
      {!rpCollapsed ? (
        <button
          type="button"
          className="pipe-page-vsplit"
          aria-orientation="vertical"
          aria-label="Drag to resize orchestrator and metrics pane. Double-click to reset width."
          title="Drag to resize metrics pane. Double-click to reset."
          onPointerDown={onRpPipePointerDown}
          onPointerMove={onRpPipePointerMove}
          onPointerUp={endRpPipeDrag}
          onPointerCancel={endRpPipeDrag}
          onDoubleClick={onRpPipeDoubleClick}
        />
      ) : null}
      <aside className={`rp ${rpCollapsed ? 'rp--collapsed' : ''}`}>
        {rpCollapsed ? (
          <button
            type="button"
            className="pipe-strip-expand pipe-strip-expand--rp"
            onClick={() => setRpCollapsed(false)}
            aria-expanded={false}
            aria-controls="pipe-rp-panel"
            title="Expand orchestrator and metrics"
          >
            Metrics
          </button>
        ) : (
          <>
            <div className="rp-head rp-head--row">
              <span className="rp-head-title">Orchestrator &amp; metrics</span>
              <button
                type="button"
                className="pipe-panel-toggle"
                onClick={() => setRpCollapsed(true)}
                aria-expanded={!rpCollapsed}
                aria-controls="pipe-rp-panel"
              >
                Hide
              </button>
            </div>
            <div id="pipe-rp-panel" className="rp-body">
              <div className="rps">
          <div className="rpl">Orchestrator &amp; durable state</div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Orchestrator + memory checkpoint</span>
              <span>{state.paLead}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pflead" style={{ width: `${state.pfLead}%` }} />
            </div>
          </div>
              </div>
              <div className="rps">
          <div className="rpl">Parallel sub-agents</div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Literature review · PubMed RAG</span>
              <span>{state.paLit}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfg" style={{ width: `${state.pfLit}%` }} />
            </div>
          </div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Data analysis · cohort / PDX</span>
              <span>{state.paExp}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfb" style={{ width: `${state.pfExp}%` }} />
            </div>
          </div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Citation governance · PMIDs</span>
              <span>{state.paGov}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfgov" style={{ width: `${state.pfGov}%` }} />
            </div>
          </div>
              </div>
              <div className="rps">
          <div className="rpl">Merge · hypothesis · citation · eval</div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Merge + compaction</span>
              <span>{state.paMerge}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfm" style={{ width: `${state.pfMerge}%` }} />
            </div>
          </div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Hypothesis generation</span>
              <span>{state.paHyp}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfh" style={{ width: `${state.pfHyp}%` }} />
            </div>
          </div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Citation agent</span>
              <span>{state.paCite}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfcite" style={{ width: `${state.pfCite}%` }} />
            </div>
          </div>
          <div className="prog-ring">
            <div className="prog-label">
              <span>Braintrust eval harness</span>
              <span>{state.paEval}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill pfeval" style={{ width: `${state.pfEval}%` }} />
            </div>
          </div>
              </div>
              <div className="rps">
          <div className="rpl">Context window</div>
          <div className="ctx-bar">
            <div className="ctx-track">
              <div
                className={`ctx-fill ${state.ctxPct < 25 ? 'low' : state.ctxPct < 55 ? 'mid' : 'high'}`}
                style={{ width: `${Math.min(100, state.ctxPct)}%` }}
              />
            </div>
            <span className="ctx-label">{state.ctxPct}K / 200K</span>
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--stone)' }}>
            {state.ctxNote}
          </div>
              </div>
              <div className="rps">
          <div className="rpl">Tools · compaction · eval signals</div>
          <div className="mg2">
            <div className="mc">
              <div className="mn ok">{state.verified}</div>
              <div className="ml">citations OK</div>
            </div>
            <div className="mc">
              <div className="mn err">{state.rejected}</div>
              <div className="ml">rejected</div>
            </div>
          </div>
          <div className="mg2">
            <div className="mc">
              <div className="mn amber">{state.pubmedCorpusQueries}</div>
              <div className="ml">PubMed corpus queries</div>
            </div>
            <div className="mc">
              <div className="mn blue">{state.toolCalls}</div>
              <div className="ml">tool_use calls</div>
            </div>
          </div>
          <div className="mg2">
            <div className="mc">
              <div className="mn purple">{state.compact}</div>
              <div className="ml">compactions</div>
            </div>
            <div className="mc">
              <div className="mn" style={{ color: 'var(--terra)' }}>
                {state.summaryRounds}
              </div>
              <div className="ml">summary rounds</div>
            </div>
          </div>
              </div>
              <div className="rps">
          <div className="rpl">Trace → next ship</div>
          <div className="mg2">
            <div className="mc">
              <div className="mn blue">{state.llmJudgeRuns}</div>
              <div className="ml">BT eval runs</div>
            </div>
            <div className="mc">
              <div className="mn err">{state.rubricFailures}</div>
              <div className="ml">scorer failures</div>
            </div>
          </div>
          <div className="mg2">
            <div className="mc">
              <div className="mn purple">{state.langsmithExportRows}</div>
              <div className="ml">LS dataset rows</div>
            </div>
            <div className="mc">
              <div className="mn ok">{state.braintrustScoredSpans}</div>
              <div className="ml">BT scored spans</div>
            </div>
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'var(--stone)', marginTop: 6 }}>
            Prompt registry: <strong>{state.promptRegistryVersion}</strong>
          </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
