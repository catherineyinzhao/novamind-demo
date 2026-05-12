import { randomUUID } from 'node:crypto'
import type { Client } from 'langsmith'
import { convertToDottedOrderFormat } from 'langsmith/run_trees'

export async function createRootLangSmithRun(
  client: Client,
  opts: {
    runId?: string
    name: string
    run_type: string
    inputs: Record<string, unknown>
    project_name?: string
  },
): Promise<{ runId: string }> {
  const runId = opts.runId ?? randomUUID()
  const startTime = Date.now()
  const { dottedOrder } = convertToDottedOrderFormat(startTime, runId, 1)

  await client.createRun({
    id: runId,
    trace_id: runId,
    dotted_order: dottedOrder,
    name: opts.name,
    run_type: opts.run_type,
    inputs: opts.inputs,
    project_name: opts.project_name,
    start_time: startTime,
  })

  return { runId }
}
