/**
 * Neutral stroke graphics for the pipeline architecture diagram.
 * Fan-out: one plan fans into three parallel workers. Fan-in: three handoffs merge downstream.
 */
const stroke = 'currentColor'

export function PipeArchFanOutGraphic() {
  return (
    <div className="pipe-arch-flow-graphic pipe-arch-flow-graphic--fanout">
      <svg
        className="pipe-arch-flow-svg"
        viewBox="0 0 300 40"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        <path d="M 150 0 L 150 10" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 52 10 L 248 10" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 52 10 L 52 22" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 150 10 L 150 22" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 248 10 L 248 22" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="pipe-arch-flow-caption">Delegation: one plan fans out to three parallel workers</span>
    </div>
  )
}

export function PipeArchFanInGraphic() {
  return (
    <div className="pipe-arch-flow-graphic pipe-arch-flow-graphic--fanin">
      <svg
        className="pipe-arch-flow-svg"
        viewBox="0 0 300 44"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        <path d="M 52 4 L 52 16" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 150 4 L 150 16" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 248 4 L 248 16" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 52 16 L 150 28" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 150 16 L 150 28" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 248 16 L 150 28" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 150 28 L 150 40" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="pipe-arch-flow-caption">Handoffs from the three lanes merge before compaction</span>
    </div>
  )
}
