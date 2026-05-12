import { randomUUID } from 'node:crypto'
import type { Client } from 'langsmith'
import { convertToDottedOrderFormat } from 'langsmith/run_trees'

/**
 * Child runs share the root trace_id and nest under parent_run_id in the LangSmith tree.
 */
export async function createLangSmithChildRun(
  client: Client,
  opts: {
    traceId: string
    parentRunId: string
    name: string
    run_type: string
    inputs: Record<string, unknown>
    project_name?: string
    /** Monotonic per trace for dotted_order tie-break (e.g. 2, 3, 4…) */
    executionOrder: number
  },
): Promise<{ childRunId: string }> {
  const childRunId = randomUUID()
  const startTime = Date.now()
  const { dottedOrder } = convertToDottedOrderFormat(startTime, childRunId, opts.executionOrder)

  await client.createRun({
    id: childRunId,
    trace_id: opts.traceId,
    parent_run_id: opts.parentRunId,
    dotted_order: dottedOrder,
    name: opts.name,
    run_type: opts.run_type,
    inputs: opts.inputs,
    project_name: opts.project_name,
    start_time: startTime,
  })

  return { childRunId }
}

export async function endLangSmithChildRun(
  client: Client,
  childRunId: string,
  patch: { outputs?: Record<string, unknown>; error?: string },
): Promise<void> {
  const end_time = Date.now()
  if (patch.error) {
    await client.updateRun(childRunId, { error: patch.error, end_time })
    return
  }
  await client.updateRun(childRunId, {
    outputs: patch.outputs,
    end_time,
  })
}
