import { useState } from 'react'

function copySessionId(id: string) {
  void navigator.clipboard?.writeText(id).catch(() => {
    /* ignore */
  })
}

export function SessionIdentityChip({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    copySessionId(sessionId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="live-session-chip" aria-label={`Research task session ${sessionId}`}>
      <span className="live-session-chip-label">Session</span>
      <span className="live-session-chip-sep" aria-hidden>
        ·
      </span>
      <code className="live-session-chip-id">{sessionId}</code>
      <button type="button" className="live-session-chip-copy" onClick={onCopy} aria-label="Copy session id">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
