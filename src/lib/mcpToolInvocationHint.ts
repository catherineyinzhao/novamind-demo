import type { PipelinePhase } from '../../shared/streamProtocol.ts'

/** Extract MCP tool basename from feed card titles produced by server/agentSdkBetaFeed.ts */
export function extractMcpToolBasename(title: string): string | null {
  const mMcp = title.match(/ · mcp · [^·]+ · (.+)$/)
  if (mMcp?.[1]) return mMcp[1].trim()
  const mFq = title.match(/mcp__[^_]+__(.+)$/)
  if (mFq?.[1]) return mFq[1].trim()
  return null
}

/**
 * Short copy explaining how an MCP tool card relates to the pipeline (no server changes).
 * Returns null for non-MCP tools (e.g. Agent delegate).
 */
export function getMcpToolInvocationHint(
  title: string,
  actorPhase: PipelinePhase | undefined,
  blockKind: 'tool' | 'tool_result',
): string | null {
  const tool = extractMcpToolBasename(title)
  if (!tool) return null

  const phaseLabel =
    actorPhase === 'literature'
      ? 'Literature review'
      : actorPhase === 'data'
        ? 'Data analysis'
        : actorPhase === 'citation'
          ? 'Citation audit'
          : actorPhase === 'hypothesis'
            ? 'Hypothesis'
            : actorPhase === 'orchestrator'
              ? 'Orchestrator'
              : 'This phase'

  const base =
    blockKind === 'tool_result'
      ? `${phaseLabel}: MCP **tool_result** — JSON below is what the \`novamind\` stdio server returned for a prior **tool_use** in this sub-agent turn (Agent SDK loop).`
      : `${phaseLabel}: the **model** emitted **tool_use** here — not a UI button. Allowed tools are set server-side for this pipeline sub-agent; MCP runs over stdio per Agent SDK.`

  const protocol =
    tool === 'query_pubmed_corpus'
      ? ' Protocol asks for multiple corpus queries and PMID-only citations (see Protocol checklist).'
      : tool === 'fetch_experiment_summary'
        ? ' Protocol asks for ≥2 experiment fetches with different cohort intent; duplicate identical calls can still happen (model variance).'
        : tool === 'demo_endpoint_trajectory'
          ? ' Deterministic demo SVG; protocol asks for **one** call — duplicates are model variance, not double-invocation from the app.'
          : tool === 'verify_claimed_pmids'
            ? ' Compares claimed PMIDs to PMIDs recorded from **query_pubmed_corpus** in this MCP session.'
            : ''

  return `${base}${protocol} See sidebar **Protocol checklist** for exact counts.`
}
