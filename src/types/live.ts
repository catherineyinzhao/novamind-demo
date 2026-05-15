import type { PipelinePhase } from '../../shared/streamProtocol.ts'

export type FeedBlock =
  | {
      id: string
      kind: 'thinking' | 'tool' | 'tool_result' | 'text' | 'result'
      title: string
      body: string
      /** When set, Live feed tints this card by pipeline actor (from server block_start). */
      actorPhase?: PipelinePhase
      /** True for orchestrator Agent-tool delegations (set client-side from stream title). */
      isAgentDelegateTool?: boolean
    }
  | {
      id: string
      kind: 'phase_mark'
      phase: PipelinePhase
      title: string
      body: string
      model?: string
      langsmithChildId?: string
    }
  | {
      id: string
      kind: 'delegate_mark'
      title: string
      body: string
    }

export type ObsLine = {
  id: string
  text: string
  tone: 'lf' | 'bt' | 'ok' | 'err' | 'neutral'
}
