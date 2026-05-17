import type { PipelinePhase } from '../../shared/streamProtocol.ts'
import {
  citationVerifySummary,
  parseCitationVerifyPayload,
} from '../../shared/citationVerifyParse.ts'
import { isCitationVerifyToolTitle } from './citationVerifyTool.ts'
import type { FeedBlock } from '../types/live'

export type LiveCitationEval = {
  admissible: number
  total: number
  rate: number | null
  unknownCount: number
}

/** Latest `verify_claimed_pmids` tool result in the feed (citation audit phase). */
export function citationEvalFromBlocks(blocks: FeedBlock[]): LiveCitationEval | null {
  let latest: LiveCitationEval | null = null
  for (const b of blocks) {
    if (b.kind !== 'tool_result' && b.kind !== 'tool') continue
    if (!isCitationVerifyToolTitle(b.title)) continue
    const payload = parseCitationVerifyPayload(b.body)
    if (!payload) continue
    const { verified, total } = citationVerifySummary(payload)
    latest = {
      admissible: verified,
      total,
      rate: total > 0 ? verified / total : null,
      unknownCount: payload.unknown_or_hallucinated.length,
    }
  }
  return latest
}

const PIPELINE_WALL_PHASES: PipelinePhase[] = [
  'orchestrator',
  'literature',
  'data',
  'hypothesis',
  'citation',
]

/** Sum completed phase wall times when available; else use elapsed ms since run start. */
export function wallClockMs(
  phaseDurationsMs: Partial<Record<PipelinePhase, number>>,
  elapsedMs: number | null,
): number | null {
  const parts = PIPELINE_WALL_PHASES.map((p) => phaseDurationsMs[p]).filter(
    (ms): ms is number => ms != null && Number.isFinite(ms),
  )
  if (parts.length > 0) {
    return parts.reduce((a, b) => a + b, 0)
  }
  if (elapsedMs != null && Number.isFinite(elapsedMs) && elapsedMs >= 0) {
    return elapsedMs
  }
  return null
}

export function formatWallSeconds(ms: number | null): string | null {
  if (ms == null || !Number.isFinite(ms)) return null
  return `${(ms / 1000).toFixed(1)}s`
}

export function citationRateLabel(rate: number | null, total: number): string {
  if (total === 0) return '—'
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(0)}%`
}
