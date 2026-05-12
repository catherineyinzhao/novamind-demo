import { useCallback, useState } from 'react'
import { ObservabilityConfigProvider } from './context/ObservabilityConfigProvider'
import { PipelineTab } from './components/pipeline/PipelineTab'
import { LiveAgentTab } from './components/live/LiveAgentTab'

export type MainTab = 'pipe' | 'live'

function NavSessionPill({
  tab,
  liveStatus,
}: {
  tab: MainTab
  liveStatus: 'idle' | 'running' | 'done'
}) {
  const mode =
    tab === 'live'
      ? liveStatus === 'running'
        ? 'running'
        : liveStatus === 'done'
          ? 'done'
          : 'idle'
      : 'idle'
  const label =
    mode === 'running' ? 'Running' : mode === 'done' ? 'Done' : 'Ready'
  const cls =
    mode === 'running' ? 'sc running' : mode === 'done' ? 'sc done' : 'sc idle'

  return (
    <div className={cls}>
      <span className="sdot" />
      <span>{label}</span>
    </div>
  )
}

function AppShell() {
  const [tab, setTab] = useState<MainTab>('pipe')
  const [liveStatus, setLiveStatus] = useState<'idle' | 'running' | 'done'>('idle')

  const onLiveSession = useCallback((s: 'idle' | 'running' | 'done') => {
    setLiveStatus(s)
  }, [])

  return (
    <div className="app">
      <nav className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="nav-mark">Anthropic</span>
          <span className="nav-sep">|</span>
          <span className="nav-prod">Claude Agent SDK</span>
        </div>
        <span className="live-badge">Demo</span>
        <div className="nav-right">
          <NavSessionPill tab={tab} liveStatus={liveStatus} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#5a5850' }}>
            NovaMind · KRAS G12C · Three sub-agents
          </span>
        </div>
      </nav>

      <div className="tabbar">
        <button
          type="button"
          className={`tab ${tab === 'pipe' ? 'active' : ''}`}
          onClick={() => setTab('pipe')}
        >
          Pipeline replay
        </button>
        <button type="button" className={`tab ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>
          Live agent <span className="tnew">live</span>
        </button>
      </div>

      <div className="main">
        <div className={`tpane ${tab === 'pipe' ? 'active' : ''}`}>
          <PipelineTab />
        </div>
        <div className={`tpane ${tab === 'live' ? 'active' : ''}`}>
          <LiveAgentTab onSessionStatus={onLiveSession} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ObservabilityConfigProvider>
      <AppShell />
    </ObservabilityConfigProvider>
  )
}
