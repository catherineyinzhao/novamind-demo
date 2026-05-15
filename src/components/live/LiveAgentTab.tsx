import { useEffect, useMemo, useRef, useState } from 'react'
import { useObservabilityConfig } from '../../context/useObservabilityConfig'
import { ObservabilitySettingsForm } from '../observability/ObservabilitySettingsForm'
import { TraceLinksCard } from '../observability/TraceLinksCard'
import { OrchestrationTimeline } from './OrchestrationTimeline'
import { LiveRunAnatomyBar } from './LiveRunAnatomyBar'
import { LivePhaseRail } from './LivePhaseRail'
import { LiveStatsRow } from './LiveStatsRow'
import { ObservabilityLoopCard } from './ObservabilityLoopCard'
import { useAgentStream } from '../../hooks/useAgentStream'
import { useEnvKeysStatus } from '../../hooks/useEnvKeysStatus'
import { AgentFeed } from './AgentFeed'
import { LiveResearchAbout } from './LiveResearchAbout'
import { NovaMindProtocolChecklist } from './NovaMindProtocolChecklist'
import { SessionTopologyStrip } from './SessionTopologyStrip'
import type { ObsLine } from '../../types/live'
import {
  ANTHROPIC_MODEL_OPTIONS,
  modelSupportsExtendedThinking,
  resolveLiveSingleModelId,
} from '../../constants/anthropicModels'
import type { AgentRunMode } from '../../../shared/streamProtocol.ts'
import { stripEmojis } from '../../utils/stripEmojis'

/** Shown only under “Alternate run modes”; default UX is the fixed research workflow (`pipeline`). */
const ADVANCED_RUN_MODE_OPTIONS: { value: AgentRunMode; label: string }[] = [
  { value: 'pipeline', label: 'Research agent (default): orchestrator + literature, data, hypothesis, citation' },
  { value: 'tools', label: 'Single agent, multi-turn tools only (demo harness)' },
  { value: 'single', label: 'Single stream, no tools (demo harness)' },
]

const DEFAULT_PROMPT = `You are helping NovaMind prioritize resistance hypotheses for KRAS G12C NSCLC with STK11 co-mutations.
Use **markdown** (e.g. ### headings and **bold**) for structure.
In 3–5 bullet points, outline plausible acquired resistance mechanisms after sotorasib and what evidence would confirm each.
Do not use emoji or pictograph characters in your answer.`

const ORCH_PANEL_LS_KEY = 'novamind-live-orch-panel-px'
const ORCH_PANEL_DEFAULT = 260
const ORCH_PANEL_MIN = 120
const ORCH_PANEL_MAX = 560

const SIDEBAR_WIDTH_LS_KEY = 'novamind-live-sidebar-px'
const SIDEBAR_WIDTH_DEFAULT = 340
const SIDEBAR_WIDTH_MIN = 260
const SIDEBAR_WIDTH_MAX = 520

function readOrchPanelHeight(): number {
  try {
    const raw = localStorage.getItem(ORCH_PANEL_LS_KEY)
    const v = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(v)) return ORCH_PANEL_DEFAULT
    return Math.min(ORCH_PANEL_MAX, Math.max(ORCH_PANEL_MIN, v))
  } catch {
    return ORCH_PANEL_DEFAULT
  }
}

function readSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_LS_KEY)
    const v = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(v)) return SIDEBAR_WIDTH_DEFAULT
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, v))
  } catch {
    return SIDEBAR_WIDTH_DEFAULT
  }
}

export function LiveAgentTab({
  onSessionStatus,
}: {
  onSessionStatus?: (s: 'idle' | 'running' | 'done') => void
}) {
  const { config, setConfig } = useObservabilityConfig()
  const [obsLines, setObsLines] = useState<ObsLine[]>([])

  const [anthropicApiKey, setAnthropicApiKey] = useState('')
  const [langsmithApiKey, setLangsmithApiKey] = useState('')
  const [braintrustApiKey, setBraintrustApiKey] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [model, setModel] = useState('')
  const [workerModel, setWorkerModel] = useState('')
  const [orchestratorModel, setOrchestratorModel] = useState('')
  const [runMode, setRunMode] = useState<AgentRunMode>('pipeline')
  const [enableThinking, setEnableThinking] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('novamind-live-sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })

  const orchPanelHRef = useRef(readOrchPanelHeight())
  const [orchPanelPx, setOrchPanelPx] = useState(readOrchPanelHeight)
  const orchDragRef = useRef<{ startY: number; startH: number } | null>(null)

  const sidebarWidthRef = useRef(readSidebarWidth())
  const [sidebarWidthPx, setSidebarWidthPx] = useState(readSidebarWidth)
  const sidebarDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const [sidebarResizing, setSidebarResizing] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('novamind-live-sidebar-collapsed', sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  const onOrchSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    orchDragRef.current = { startY: e.clientY, startH: orchPanelHRef.current }
  }

  const onOrchSplitterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = orchDragRef.current
    if (!d) return
    const dy = e.clientY - d.startY
    const next = Math.min(ORCH_PANEL_MAX, Math.max(ORCH_PANEL_MIN, d.startH - dy))
    if (next !== orchPanelHRef.current) {
      orchPanelHRef.current = next
      setOrchPanelPx(next)
    }
  }

  const onOrchSplitterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    orchDragRef.current = null
    try {
      localStorage.setItem(ORCH_PANEL_LS_KEY, String(orchPanelHRef.current))
    } catch {
      /* ignore */
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const onOrchSplitterDoubleClick = () => {
    orchPanelHRef.current = ORCH_PANEL_DEFAULT
    setOrchPanelPx(ORCH_PANEL_DEFAULT)
    try {
      localStorage.setItem(ORCH_PANEL_LS_KEY, String(ORCH_PANEL_DEFAULT))
    } catch {
      /* ignore */
    }
  }

  const onSidebarSplitterPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    sidebarDragRef.current = { startX: e.clientX, startW: sidebarWidthRef.current }
    setSidebarResizing(true)
  }

  const onSidebarSplitterPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = sidebarDragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const next = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, d.startW + dx))
    if (next !== sidebarWidthRef.current) {
      sidebarWidthRef.current = next
      setSidebarWidthPx(next)
    }
  }

  const endSidebarSplitterDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    sidebarDragRef.current = null
    setSidebarResizing(false)
    try {
      localStorage.setItem(SIDEBAR_WIDTH_LS_KEY, String(sidebarWidthRef.current))
    } catch {
      /* ignore */
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const onSidebarSplitterDoubleClick = () => {
    sidebarWidthRef.current = SIDEBAR_WIDTH_DEFAULT
    setSidebarWidthPx(SIDEBAR_WIDTH_DEFAULT)
    try {
      localStorage.setItem(SIDEBAR_WIDTH_LS_KEY, String(SIDEBAR_WIDTH_DEFAULT))
    } catch {
      /* ignore */
    }
  }

  const {
    blocks,
    orchSteps,
    langSmithChildren,
    braintrustChildren,
    activePhase,
    completedPhases,
    phaseDurationsMs,
    liveStats,
    streamingTextId,
    running,
    run,
    stop,
  } = useAgentStream({
    onObsLine: (line) => setObsLines((prev) => [...prev.slice(-120), line]),
    onLangSmithRunId: (id) => setConfig({ langSmithRunId: id }),
  })

  const phaseWallSummary = useMemo(() => {
    if (runMode !== 'pipeline') return ''
    const order = ['orchestrator', 'literature', 'data', 'hypothesis', 'citation'] as const
    const short: Record<(typeof order)[number], string> = {
      orchestrator: 'orch',
      literature: 'lit',
      data: 'data',
      hypothesis: 'hyp',
      citation: 'cite',
    }
    const parts = order
      .map((p) => {
        const ms = phaseDurationsMs[p]
        if (ms == null || !Number.isFinite(ms)) return null
        return `${short[p]} ${(ms / 1000).toFixed(1)}s`
      })
      .filter(Boolean)
    return parts.join(' · ')
  }, [runMode, phaseDurationsMs])

  const { data: envKeys, loading: envKeysLoading, error: envKeysError } = useEnvKeysStatus()
  const ep = envKeys?.live

  const sessionMemo = useMemo(() => {
    if (running) return 'running' as const
    if (blocks.length > 0) return 'done' as const
    return 'idle' as const
  }, [running, blocks.length])

  useEffect(() => {
    onSessionStatus?.(sessionMemo)
  }, [sessionMemo, onSessionStatus])

  const ak = anthropicApiKey.trim()
  const lk = langsmithApiKey.trim()
  const bk = braintrustApiKey.trim()

  const allEmpty = !ak && !lk && !bk
  const allFilled = !!(ak && lk && bk)
  const mixedUi = (ak || lk || bk) && !allFilled
  const envCoversAll = !!(ep?.anthropic && ep?.langsmith && ep?.braintrust)
  const fetchFailed = !envKeysLoading && Boolean(envKeysError) && envKeys == null

  const useUiKeys = allFilled
  const useEnvKeys = allEmpty && !mixedUi && (envCoversAll || fetchFailed)
  const keysPartial =
    mixedUi ||
    (allEmpty && !envKeysLoading && envKeys != null && !envCoversAll && !fetchFailed)
  const waitingEnvProbe = envKeysLoading && allEmpty
  const keysReady = !waitingEnvProbe && (useUiKeys || useEnvKeys)

  const handleRun = () => {
    if (!keysReady || keysPartial) return
    const sub =
      runMode === 'single'
        ? undefined
        : (workerModel.trim() || model.trim() || undefined)
    void run({
      prompt,
      anthropicApiKey: ak,
      langsmithApiKey: lk,
      braintrustApiKey: bk,
      braintrustProject: config.braintrustProject.trim() || 'Global',
      braintrustOrg: config.braintrustOrg.trim() || undefined,
      langsmithProjectName: config.langSmithProjectId.trim() || undefined,
      model: runMode === 'single' ? model.trim() || undefined : undefined,
      subagentModel: sub,
      orchestratorModel: runMode === 'pipeline' ? orchestratorModel.trim() || undefined : undefined,
      enableThinking: runMode === 'single' && enableThinking,
      runMode,
    })
  }

  const anthropicFromEnv = !anthropicApiKey.trim() && !!ep?.anthropic
  const langsmithFromEnv = !langsmithApiKey.trim() && !!ep?.langsmith
  const braintrustFromEnv = !braintrustApiKey.trim() && !!ep?.braintrust

  return (
    <div
      className={`live-layout ${sidebarCollapsed ? 'live-layout--sidebar-collapsed' : ''} ${sidebarResizing ? 'live-layout--sidebar-dragging' : ''}`}
      style={
        sidebarCollapsed
          ? undefined
          : ({ ['--live-sidebar-px' as string]: `${sidebarWidthPx}px` } as React.CSSProperties)
      }
    >
      <aside className={`live-sidebar ${sidebarCollapsed ? 'live-sidebar--collapsed' : ''}`}>
        <div className="live-sidebar-inner">
          <div id="live-sidebar-panel" className="live-sidebar-panel">
        <div className="live-sidebar-sec">
          <div className="live-sidebar-lbl-row">
            <div className="live-sidebar-lbl">Sidebar</div>
            {!sidebarCollapsed ? (
              <button
                type="button"
                className="live-sidebar-collapse-btn"
                onClick={() => setSidebarCollapsed(true)}
                aria-controls="live-sidebar-panel"
                aria-expanded={!sidebarCollapsed}
              >
                Collapse
              </button>
            ) : null}
          </div>

          <details className="live-sidebar-disclosure" defaultOpen>
            <summary className="live-sidebar-disclosure-summary">API keys</summary>
            <p className="link-inline-note" style={{ marginBottom: 10 }}>
              Use a root <strong>.env</strong> file (see <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>.env.example</span>) so the API can read{' '}
              <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>ANTHROPIC_API_KEY</span>,{' '}
              <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>LANGSMITH_API_KEY</span>, and{' '}
              <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>BRAINTRUST_API_KEY</span>, or paste keys here. Leave all three
              fields empty to rely on <strong>.env</strong> only — body values override env when set.
            </p>
            {waitingEnvProbe ? (
              <p className="link-inline-note" style={{ marginBottom: 8 }}>
                Checking server for configured keys…
              </p>
            ) : null}
            {fetchFailed && allEmpty ? (
              <p className="link-inline-note" style={{ marginBottom: 8, color: 'var(--stone)' }}>
                Could not reach <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>/api/env-keys</span>; you can still run if the API server is up and{' '}
                <strong>.env</strong> is loaded.
              </p>
            ) : null}
            {keysPartial ? (
              <p className="link-inline-note" style={{ color: 'var(--red)', marginBottom: 8 }}>
                {mixedUi
                  ? 'Fill all three keys or clear all three to use environment variables.'
                  : `Add missing keys to .env or paste below: ${[
                      !ep?.anthropic && 'ANTHROPIC_API_KEY',
                      !ep?.langsmith && 'LANGSMITH_API_KEY (or LANGCHAIN_API_KEY)',
                      !ep?.braintrust && 'BRAINTRUST_API_KEY',
                    ]
                      .filter(Boolean)
                      .join(', ')}`}
              </p>
            ) : null}
            <div className="lp-field">
              <div className="lp-label-row">
                <label className="lp-label">Anthropic API key</label>
                {!anthropicApiKey.trim() && ep ? (
                  <span className={`env-key-pill ${ep.anthropic ? '' : 'warn'}`}>
                    {ep.anthropic ? 'From .env' : 'Not in .env'}
                  </span>
                ) : null}
              </div>
              <input
                className={`lp-input ${anthropicFromEnv ? 'lp-input--from-env' : ''}`}
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder={
                  ep?.anthropic && !anthropicApiKey.trim()
                    ? 'Using server ANTHROPIC_API_KEY — paste to override'
                    : 'sk-ant-api03-…'
                }
                autoComplete="off"
              />
            </div>
            <div className="lp-field">
              <div className="lp-label-row">
                <label className="lp-label">LangSmith API key</label>
                {!langsmithApiKey.trim() && ep ? (
                  <span className={`env-key-pill ${ep.langsmith ? '' : 'warn'}`}>
                    {ep.langsmith ? 'From .env' : 'Not in .env'}
                  </span>
                ) : null}
              </div>
              <input
                className={`lp-input ${langsmithFromEnv ? 'lp-input--from-env' : ''}`}
                type="password"
                value={langsmithApiKey}
                onChange={(e) => setLangsmithApiKey(e.target.value)}
                placeholder={
                  ep?.langsmith && !langsmithApiKey.trim()
                    ? 'Using server LANGSMITH_API_KEY — paste to override'
                    : 'lsv2_pt_…'
                }
                autoComplete="off"
              />
            </div>
            <div className="lp-field">
              <div className="lp-label-row">
                <label className="lp-label">Braintrust API key</label>
                {!braintrustApiKey.trim() && ep ? (
                  <span className={`env-key-pill ${ep.braintrust ? '' : 'warn'}`}>
                    {ep.braintrust ? 'From .env' : 'Not in .env'}
                  </span>
                ) : null}
              </div>
              <input
                className={`lp-input ${braintrustFromEnv ? 'lp-input--from-env' : ''}`}
                type="password"
                value={braintrustApiKey}
                onChange={(e) => setBraintrustApiKey(e.target.value)}
                placeholder={
                  ep?.braintrust && !braintrustApiKey.trim()
                    ? 'Using server BRAINTRUST_API_KEY — paste to override'
                    : 'sk-braintrust-…'
                }
                autoComplete="off"
              />
            </div>
          </details>

          <details className="live-sidebar-disclosure" defaultOpen>
            <summary className="live-sidebar-disclosure-summary">Run options</summary>
            {runMode === 'single' ? (
              <div className="lp-field">
                <label className="lp-label">Model</label>
                <select
                  className="lp-input"
                  value={model}
                  onChange={(e) => {
                    const v = e.target.value
                    setModel(v)
                    const effective = resolveLiveSingleModelId(v)
                    setEnableThinking(modelSupportsExtendedThinking(effective))
                  }}
                  aria-label="Anthropic model"
                >
                  {ANTHROPIC_MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value || 'default'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {runMode === 'pipeline' ? (
              <div className="lp-field">
                <label className="lp-label">Orchestrator model (planning)</label>
                <select
                  className="lp-input"
                  value={orchestratorModel}
                  onChange={(e) => setOrchestratorModel(e.target.value)}
                  aria-label="Orchestrator model"
                >
                  {ANTHROPIC_MODEL_OPTIONS.map((opt) => (
                    <option key={`orch-${opt.value || 'default'}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="link-inline-note" style={{ marginTop: 6 }}>
                  Empty → server uses <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>ANTHROPIC_ORCHESTRATOR_MODEL</span> or Opus default. Heavier model sets delegate plan, JSON targets, citation policy.
                </p>
              </div>
            ) : null}
            {runMode !== 'single' ? (
              <div className="lp-field">
                <label className="lp-label">Worker model (sub-agents)</label>
                <select
                  className="lp-input"
                  value={workerModel}
                  onChange={(e) => setWorkerModel(e.target.value)}
                  aria-label="Worker model for tools or pipeline sub-agents"
                >
                  {ANTHROPIC_MODEL_OPTIONS.map((opt) => (
                    <option key={`work-${opt.value || 'default'}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="link-inline-note" style={{ marginTop: 6 }}>
                  Empty → <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>ANTHROPIC_SUBAGENT_MODEL</span>,{' '}
                  <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>ANTHROPIC_MODEL</span>, then server default (Sonnet-class recommended for tool-heavy sub-agents).
                </p>
              </div>
            ) : null}
            <details className="live-harness-advanced">
              <summary className="live-harness-advanced-summary">More: alternate run modes</summary>
              <p className="link-inline-note" style={{ marginBottom: 8 }}>
                The default run is the research agent described under <strong>About this demo</strong> below. Use this only for a simpler Messages API harness (single turn or one agent with a tool loop).
              </p>
              <label className="lp-label" htmlFor="live-advanced-run-mode">
                Harness mode
              </label>
              <select
                id="live-advanced-run-mode"
                className="lp-input"
                value={runMode}
                onChange={(e) => {
                  const next = e.target.value as AgentRunMode
                  setRunMode(next)
                  if (next === 'single') {
                    const effective = resolveLiveSingleModelId(model)
                    setEnableThinking(modelSupportsExtendedThinking(effective))
                  } else {
                    setEnableThinking(false)
                  }
                }}
                aria-label="Alternate API harness mode"
              >
                {ADVANCED_RUN_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </details>
            <label
              title="Only single-stream mode sends extended thinking to the API. Auto-on when you pick a model that supports it; uncheck to turn off until you change the model."
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: runMode === 'single' ? 'var(--stone)' : 'var(--stone-lt)',
                cursor: runMode === 'single' ? 'pointer' : 'not-allowed',
                marginBottom: 8,
              }}
            >
              <input
                type="checkbox"
                checked={runMode === 'single' && enableThinking}
                disabled={runMode !== 'single'}
                onChange={(e) => setEnableThinking(e.target.checked)}
              />
              Extended thinking (auto for capable models in single-stream mode; you can turn off)
            </label>
          </details>

          <details className="live-sidebar-disclosure" defaultOpen>
            <summary className="live-sidebar-disclosure-summary">About this demo</summary>
            <LiveResearchAbout runMode={runMode} omitSectionLabel />
          </details>
        </div>
        <ObservabilitySettingsForm />
        <TraceLinksCard config={config} />
        <div className="live-sidebar-sec live-sidebar-scroll">
          <details className="live-sidebar-disclosure">
            <summary className="live-sidebar-disclosure-summary">Traces, evals &amp; harness loop</summary>
            <ObservabilityLoopCard langSmithRunId={config.langSmithRunId} />
          </details>
        </div>
          </div>
          <button
            type="button"
            className="live-sidebar-gutter"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-expanded={!sidebarCollapsed}
            aria-controls="live-sidebar-panel"
            title={sidebarCollapsed ? 'Expand API keys and configuration' : 'Collapse sidebar'}
          >
            <span className="live-sidebar-grip" aria-hidden>
              <svg width="5" height="40" viewBox="0 0 5 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <line x1="1" y1="20" x2="4" y2="20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <line x1="1" y1="30" x2="4" y2="30" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </div>
      </aside>
      {!sidebarCollapsed ? (
        <button
          type="button"
          className="live-layout-vsplit"
          aria-orientation="vertical"
          aria-label="Drag to resize sidebar width. Double-click to reset."
          title="Drag to resize sidebar. Double-click to reset width."
          onPointerDown={onSidebarSplitterPointerDown}
          onPointerMove={onSidebarSplitterPointerMove}
          onPointerUp={endSidebarSplitterDrag}
          onPointerCancel={endSidebarSplitterDrag}
          onDoubleClick={onSidebarSplitterDoubleClick}
        />
      ) : null}
      <div className="live-main">
        <div className="live-main-strip">
          <LiveRunAnatomyBar
            runMode={runMode}
            model={model}
            workerModel={workerModel}
            orchestratorModel={orchestratorModel}
            enableThinking={runMode === 'single' && enableThinking}
          />
          <SessionTopologyStrip runMode={runMode} variant="live" />
          <NovaMindProtocolChecklist runMode={runMode} />
          <LivePhaseRail
            runMode={runMode}
            activePhase={activePhase}
            completedPhases={completedPhases}
            phaseDurationsMs={phaseDurationsMs}
          />
          <LiveStatsRow
            stats={liveStats}
            running={running}
            phaseWallSummary={runMode === 'pipeline' ? phaseWallSummary : undefined}
          />
        </div>
        <p className="live-feed-caption">
          <strong>Feed</strong> · streamed assistant tokens, <code style={{ fontSize: 10 }}>tool_use</code> / tool payloads, and phase-titled blocks from{' '}
          <code style={{ fontSize: 10 }}>query()</code>.
        </p>
        <div className="live-feed">
          <AgentFeed blocks={blocks} streamingTextId={streamingTextId} running={running} />
        </div>
        <div className="live-controls" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <textarea
            className="tab-input"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt…"
            style={{ resize: 'vertical', minHeight: 88, fontFamily: "'Lora', serif", fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="tab-btn primary"
              disabled={running || !keysReady || keysPartial}
              onClick={handleRun}
              aria-label={
                runMode === 'pipeline'
                  ? 'Run research agent (orchestrator and literature, data, hypothesis, citation workers)'
                  : runMode === 'tools'
                    ? 'Run multi-turn tool loop harness'
                    : 'Run single-stream harness'
              }
            >
              Run
            </button>
            <button type="button" className="tab-btn danger" disabled={!running} onClick={stop}>
              Stop
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--stone)' }}>
              {waitingEnvProbe
                ? 'Checking keys…'
                : keysPartial
                  ? 'Resolve API keys'
                  : !keysReady
                    ? 'Cannot run'
                    : running
                      ? 'Streaming…'
                      : useEnvKeys
                        ? fetchFailed
                          ? 'Using server .env (probe failed)'
                          : 'Using .env keys'
                        : useUiKeys
                          ? 'Using pasted keys'
                          : 'Idle'}
            </span>
          </div>
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize traces panel: drag up or down. Double-click to reset height."
          title="Drag to resize traces panel. Double-click to reset height."
          className="live-run-splitter"
          onPointerDown={onOrchSplitterPointerDown}
          onPointerMove={onOrchSplitterPointerMove}
          onPointerUp={onOrchSplitterPointerUp}
          onPointerCancel={onOrchSplitterPointerUp}
          onDoubleClick={onOrchSplitterDoubleClick}
        >
          <span className="live-run-splitter-hint">Resize traces</span>
        </div>
        <div
          className="live-orchestration-stack"
          style={{
            height: orchPanelPx,
            minHeight: ORCH_PANEL_MIN,
            maxHeight: ORCH_PANEL_MAX,
          }}
        >
          <OrchestrationTimeline
            orchSteps={orchSteps}
            langSmithChildren={langSmithChildren}
            braintrustChildren={braintrustChildren}
            runMode={runMode}
            model={model}
            workerModel={workerModel}
            orchestratorModel={orchestratorModel}
            enableThinking={runMode === 'single' && enableThinking}
          />
          <ObsLogPanel lines={obsLines} />
        </div>
      </div>
    </div>
  )
}

function ObsLogPanel({ lines }: { lines: ObsLine[] }) {
  if (lines.length === 0) return null
  return (
    <div style={{ padding: '0 16px 12px', flexShrink: 0, background: 'var(--surf)' }}>
      <div className="live-sidebar-lbl" style={{ marginBottom: 6 }}>
        Observability log
      </div>
      <div className="obs-log">
        {lines.map((l) => (
          <span key={l.id} className={`obs-log-line ${l.tone}`}>
            {stripEmojis(l.text)}
            {'\n'}
          </span>
        ))}
      </div>
    </div>
  )
}
