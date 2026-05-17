/** Parsed body from novamind MCP `verify_claimed_pmids`. */
export type CitationVerifyPayload = {
  admissible: string[]
  unknown_or_hallucinated: string[]
  session_corpus_hits?: number
  policy_note?: string
}

export function parseCitationVerifyPayload(body: string): CitationVerifyPayload | null {
  const trimmed = body.trim()
  if (!trimmed) return null
  try {
    const raw = JSON.parse(trimmed) as Record<string, unknown>
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const admissible = Array.isArray(raw.admissible)
      ? raw.admissible.map((x) => String(x).trim()).filter(Boolean)
      : []
    const unknown_or_hallucinated = Array.isArray(raw.unknown_or_hallucinated)
      ? raw.unknown_or_hallucinated.map((x) => String(x).trim()).filter(Boolean)
      : []
    return {
      admissible,
      unknown_or_hallucinated,
      ...(typeof raw.session_corpus_hits === 'number'
        ? { session_corpus_hits: raw.session_corpus_hits }
        : {}),
      ...(typeof raw.policy_note === 'string' ? { policy_note: raw.policy_note } : {}),
    }
  } catch {
    return null
  }
}

export function citationVerifySummary(payload: CitationVerifyPayload): {
  verified: number
  total: number
  label: string
} {
  const total = payload.admissible.length + payload.unknown_or_hallucinated.length
  const verified = payload.admissible.length
  const label =
    total === 0
      ? 'No PMIDs checked'
      : verified === total
        ? `${verified}/${total} verified`
        : `${verified}/${total} admissible`
  return { verified, total, label }
}

export function isVerifyClaimedPmidsToolName(name: string): boolean {
  const n = name.trim()
  return (
    n === 'verify_claimed_pmids' ||
    n === 'mcp__novamind__verify_claimed_pmids' ||
    n.endsWith('__verify_claimed_pmids')
  )
}
