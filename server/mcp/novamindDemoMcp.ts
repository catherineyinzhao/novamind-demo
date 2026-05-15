/**
 * Stdio MCP server exposing NovaMind demo PubMed + experiment stubs.
 * Launched by Claude Agent SDK via `mcpServers` (see server/runAgentSdkLive.ts).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'
import { executeDemoTool } from '../demoTools.ts'

/** PMIDs returned by `query_pubmed_corpus` in this MCP process lifetime (one Agent SDK session). */
const sessionAdmissiblePmids = new Set<string>()

function ingestPmidsFromPubmedToolText(text: string) {
  try {
    const j = JSON.parse(text) as { snippets?: string[] }
    for (const line of j.snippets ?? []) {
      const re = /\[PMID:([^\]]+)\]/g
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        sessionAdmissiblePmids.add(m[1].trim())
      }
    }
  } catch {
    /* ignore malformed tool output */
  }
}

const server = new McpServer({
  name: 'novamind-demo',
  version: '1.0.0',
})

server.registerTool(
  'query_pubmed_corpus',
  {
    description:
      'Semantic retrieval over NovaMind’s ingested PubMed article store (~3y). Demo returns fictional PMIDs.',
    inputSchema: {
      query: z.string().describe('Focused search query'),
      max_results: z.number().int().min(1).max(5).optional().describe('Number of snippets (1–5)'),
    },
  },
  async (args) => {
    const text = executeDemoTool('query_pubmed_corpus', args)
    ingestPmidsFromPubmedToolText(text)
    return {
      content: [{ type: 'text' as const, text }],
    }
  },
)

server.registerTool(
  'fetch_experiment_summary',
  {
    description:
      'Structured xenograft / PDX outcome summaries for the NovaMind demo cohort (client experimental plane).',
    inputSchema: {
      cohort_id: z.string().optional().describe('Optional cohort label'),
    },
  },
  async (args) => {
    const text = executeDemoTool('fetch_experiment_summary', args)
    return {
      content: [{ type: 'text' as const, text }],
    }
  },
)

server.registerTool(
  'demo_endpoint_trajectory',
  {
    description:
      'Deterministic demo chart (SVG) for client reporting — stands in for matplotlib / hosted viz services.',
    inputSchema: {
      cohort_id: z.string().optional().describe('Optional caption label'),
    },
  },
  async (args) => {
    const text = executeDemoTool('demo_endpoint_trajectory', args)
    return {
      content: [{ type: 'text' as const, text }],
    }
  },
)

server.registerTool(
  'verify_claimed_pmids',
  {
    description:
      'Compare claimed PMIDs against PMIDs returned by query_pubmed_corpus in this session only (citation governance demo).',
    inputSchema: {
      claimed_pmids: z.array(z.string()).describe('Candidate PMID strings extracted from model text'),
    },
  },
  async (args) => {
    const claimed = [...new Set(args.claimed_pmids.map((s) => String(s).trim()).filter(Boolean))]
    const admissible: string[] = []
    const unknown_or_hallucinated: string[] = []
    for (const id of claimed) {
      if (sessionAdmissiblePmids.has(id)) admissible.push(id)
      else unknown_or_hallucinated.push(id)
    }
    const body = JSON.stringify(
      {
        admissible,
        unknown_or_hallucinated,
        session_corpus_hits: sessionAdmissiblePmids.size,
        policy_note:
          'PMIDs are admissible only if they appeared in a prior query_pubmed_corpus tool return in this MCP session.',
      },
      null,
      2,
    )
    return {
      content: [{ type: 'text' as const, text: body }],
    }
  },
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('novamind MCP server error:', err)
  process.exit(1)
})
