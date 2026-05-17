import type { ReactNode } from 'react'
import { ANTHROPIC_MODEL_OPTIONS } from '../../constants/anthropicModels'
import type { AgentRunMode } from '../../../shared/streamProtocol.ts'

function modelChip(value: string): string {
  const v = value.trim()
  if (!v) return 'Server default'
  const opt = ANTHROPIC_MODEL_OPTIONS.find((o) => o.value === v)
  return opt?.label ?? v
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="live-anatomy-chip">{children}</span>
}

export function LiveRunAnatomyBar({
  runMode,
  model,
  workerModel,
  orchestratorModel,
  enableThinking,
}: {
  runMode: AgentRunMode
  model: string
  workerModel: string
  orchestratorModel: string
  enableThinking: boolean
}) {
  return (
    <div className="live-anatomy-bar" aria-label="This run uses">
      <span className="live-anatomy-label">This run</span>
      <Chip>Claude Agent SDK · query()</Chip>
      {runMode === 'single' && enableThinking ? <Chip>Extended thinking</Chip> : null}
      {runMode === 'single' ? <Chip>Model: {modelChip(model)}</Chip> : null}
      {runMode === 'tools' ? (
        <>
          <Chip>tool_use · multi-turn loop</Chip>
          <Chip>query_pubmed_corpus</Chip>
          <Chip>fetch_experiment_summary</Chip>
          <Chip>Worker: {modelChip(workerModel)}</Chip>
        </>
      ) : null}
      {runMode === 'pipeline' ? (
        <>
          <Chip>Agent SDK · orchestrator + 4 specialists · AgentDefinition per lane</Chip>
          <Chip>LangSmith / Braintrust · traces</Chip>
          <Chip>Orchestrator · planning + delegation: {modelChip(orchestratorModel)}</Chip>
          <Chip>Workers: {modelChip(workerModel)}</Chip>
        </>
      ) : null}
    </div>
  )
}
