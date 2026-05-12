import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages.js'

const PUBMED_TOOL: Tool = {
  name: 'query_pubmed_corpus',
  description:
    'Semantic retrieval over NovaMind’s ingested PubMed article store (external corpus from your document ingestion + indexing pipeline, ~3y window in production). Returns short abstract snippets with fictional PMIDs in this demo only. Use for resistance mechanisms, trials, and biomarkers — not for data that lives only in client lab systems.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Focused query (e.g. KRAS G12C STK11 resistance sotorasib)',
      },
      max_results: {
        type: 'integer',
        description: 'Number of snippets to return (1–5)',
      },
    },
    required: ['query'],
  },
}

const EXPERIMENT_TOOL: Tool = {
  name: 'fetch_experiment_summary',
  description:
    'Load structured xenograft / PDX outcome summaries for the NovaMind cohort (KRAS G12C + STK11 co-mutation theme). Represents client-owned experimental data separate from the PubMed corpus.',
  input_schema: {
    type: 'object' as const,
    properties: {
      cohort_id: {
        type: 'string',
        description: 'Optional cohort label (default demo cohort if omitted)',
      },
    },
    required: [],
  },
}

/** Literature-review sub-agent only — external PubMed corpus via tool (no full corpus in context). */
export const DEMO_LITERATURE_TOOLS: Tool[] = [PUBMED_TOOL]

/** Data-analysis sub-agent only — validates themes against the client experimental plane. */
export const DEMO_DATA_TOOLS: Tool[] = [EXPERIMENT_TOOL]

/**
 * Demo-only tools — deterministic stubs. “Tools” run mode exposes both planes; pipeline assigns each tool to a
 * dedicated sub-agent phase.
 */
export const DEMO_AGENT_TOOLS: Tool[] = [...DEMO_LITERATURE_TOOLS, ...DEMO_DATA_TOOLS]

type ToolArgs = Record<string, unknown>

export function executeDemoTool(name: string, rawInput: unknown): string {
  const input = (rawInput && typeof rawInput === 'object' ? rawInput : {}) as ToolArgs

  switch (name) {
    case 'query_pubmed_corpus':
    case 'search_pubmed_literature': {
      const q = String(input.query ?? '').trim() || 'KRAS resistance'
      const max = Math.min(5, Math.max(1, Number(input.max_results) || 3))
      const snippets = [
        `[PMID:demo-903214] Combo loss of STK11/LKB1 promotes inflammatory signaling that may bypass KRAS(G12C) inhibition in NSCLC — suggests dual pathway redundancy.`,
        `[PMID:demo-771902] Acquired KRAS G12D/G12R substitutions reported post-sotorasib in subset of PDX models; paired WGS recommended.`,
        `[PMID:demo-445821] MET amplification overlaps with KRAS G12C relapse in STK11-deficient tumors — combination rationale.`,
      ].slice(0, max)

      return JSON.stringify(
        {
          query_used: q,
          store: 'external_pubmed_corpus',
          note: 'Demo stub — production calls NovaMind ingested PubMed service.',
          snippets,
        },
        null,
        2,
      )
    }
    case 'fetch_experiment_summary': {
      const cohort = String(input.cohort_id ?? 'novamind-demo-cohort')
      return JSON.stringify(
        {
          cohort_id: cohort,
          model: 'KRAS G12C / STK11-deficient PDX panel',
          endpoints: [
            { arm: 'sotorasib', best_response: 'partial_response', duration_weeks: 11 },
            { arm: 'sotorasib + MEKi (exploratory)', best_response: 'stable_disease', duration_weeks: 18 },
          ],
          emerging_signal:
            'Longer disease control when MAPK feedback recovery was pharmacologically dampened — aligns with literature on bypass signaling.',
          disclaimer: 'Synthetic demo metrics for UI orchestration only.',
        },
        null,
        2,
      )
    }
    default:
      return JSON.stringify({ error: `unknown_tool: ${name}` })
  }
}
