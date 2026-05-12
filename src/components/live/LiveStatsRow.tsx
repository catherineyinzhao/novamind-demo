export type LiveRunStats = {
  toolBlocks: number
  thinkingBlocks: number
  obsLf: number
  obsBt: number
  langsmithChildren: number
  braintrustRoot: number
  braintrustChildren: number
}

export function LiveStatsRow({ stats, running }: { stats: LiveRunStats; running: boolean }) {
  return (
    <div className="live-stats-row" aria-live="polite">
      <span className="live-stats-item">
        tool blocks <strong>{stats.toolBlocks}</strong>
      </span>
      <span className="live-stats-sep" aria-hidden>
        ·
      </span>
      <span className="live-stats-item">
        thinking <strong>{stats.thinkingBlocks}</strong>
      </span>
      <span className="live-stats-sep" aria-hidden>
        ·
      </span>
      <span className="live-stats-item">
        LS children <strong>{stats.langsmithChildren}</strong>
      </span>
      <span className="live-stats-sep" aria-hidden>
        ·
      </span>
      <span className="live-stats-item">
        BT root <strong>{stats.braintrustRoot}</strong>
      </span>
      <span className="live-stats-sep" aria-hidden>
        ·
      </span>
      <span className="live-stats-item">
        BT nested <strong>{stats.braintrustChildren}</strong>
      </span>
      <span className="live-stats-sep" aria-hidden>
        ·
      </span>
      <span className="live-stats-item">
        obs LF <strong>{stats.obsLf}</strong>
      </span>
      <span className="live-stats-sep" aria-hidden>
        ·
      </span>
      <span className="live-stats-item">
        obs BT <strong>{stats.obsBt}</strong>
      </span>
      {running ? <span className="live-stats-pulse" aria-hidden /> : null}
    </div>
  )
}
