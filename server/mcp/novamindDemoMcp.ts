/**
 * Stdio MCP server exposing NovaMind demo PubMed + experiment stubs.
 * Launched by Claude Agent SDK via `mcpServers` (see server/runAgentSdkLive.ts).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'
import { executeDemoTool } from '../demoTools.ts'

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

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('novamind MCP server error:', err)
  process.exit(1)
})
