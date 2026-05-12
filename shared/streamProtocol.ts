/** NDJSON line protocol for POST /api/agent/stream (server → browser). */

export type ObsTone = 'lf' | 'bt' | 'ok' | 'err' | 'neutral'

export type FeedKind = 'thinking' | 'tool' | 'tool_result' | 'text' | 'result'

/** Stream event + row shape for the Live tab orchestration timeline (LangSmith / Braintrust / eval story). */
export type OrchestrationStep = {
  type: 'orch_step'
  id: string
  phase: string
  title: string
  detail?: string
  model?: string
  langsmithChildId?: string
  braintrustSpanName?: string
}

export type LangSmithChildEvent = {
  type: 'langsmith_child'
  name: string
  childRunId: string
  parentRunId: string
  role: 'orchestrator' | 'literature' | 'data_analysis' | 'hypothesis'
}

/** Nested Braintrust span under the session root (orchestrator / sub-agent phases). */
export type BraintrustChildEvent = {
  type: 'braintrust_child'
  spanId: string
  name: string
}

/** Pipeline-only: drives Live phase rail (orchestrator → literature → data → hypothesis). */
export type PipelinePhase = 'orchestrator' | 'literature' | 'data' | 'hypothesis'

export type PhaseStartEvent = {
  type: 'phase_start'
  phase: PipelinePhase
  model?: string
  langsmithChildId?: string
}

export type PhaseEndEvent = {
  type: 'phase_end'
  phase: PipelinePhase
}

export type StreamEvent =
  | { type: 'langsmith_run'; runId: string }
  | { type: 'braintrust_span'; spanId: string }
  | BraintrustChildEvent
  | OrchestrationStep
  | LangSmithChildEvent
  | PhaseStartEvent
  | PhaseEndEvent
  | { type: 'obs'; tone: ObsTone; text: string }
  | { type: 'block_start'; id: string; blockKind: FeedKind; title: string }
  | { type: 'block_delta'; id: string; text: string }
  | { type: 'error'; message: string }
  | { type: 'done'; aborted?: boolean }

/** How the server orchestrates Anthropic calls. Default `pipeline` is the Live tab’s research-agent workflow; other values are optional harness demos. */
export type AgentRunMode =
  /** One Messages stream, no tools (harness demo). */
  | 'single'
  /** Multi-turn agent loop with demo tools (harness demo). */
  | 'tools'
  /**
   * Default research agent on the server: orchestrator planning pass, then literature review (PubMed corpus tool),
   * data analysis (client cohort tool), hypothesis generation (synthesis, no tools). Semi-autonomous sub-agent split.
   */
  | 'pipeline'

export type AgentStreamRequest = {
  prompt: string
  /** Omitted or empty → server uses ANTHROPIC_API_KEY from `.env` */
  anthropicApiKey?: string
  /** Omitted or empty → LANGSMITH_API_KEY or LANGCHAIN_API_KEY */
  langsmithApiKey?: string
  /** Omitted or empty → BRAINTRUST_API_KEY */
  braintrustApiKey?: string
  /** Braintrust project name (creates project if missing). */
  braintrustProject: string
  braintrustOrg?: string
  /** LangSmith project name (human-readable) for createRun.project_name */
  langsmithProjectName?: string
  /** Optional model id override (single stream, or sub-agent default when subagentModel omitted) */
  model?: string
  /**
   * Token-heavy planning model (e.g. Opus-class) for pipeline orchestrator pass only.
   * Falls back to ANTHROPIC_ORCHESTRATOR_MODEL env, then a sensible Opus default.
   */
  orchestratorModel?: string
  /**
   * Lighter model for literature / data / hypothesis sub-agents in pipeline (and tool loop).
   * Falls back to ANTHROPIC_SUBAGENT_MODEL env, then `model`, then server default.
   */
  subagentModel?: string
  /** Enables extended thinking when true (compatible models only). */
  enableThinking?: boolean
  /** Defaults to single if omitted. Thinking is applied only in single mode for API compatibility. */
  runMode?: AgentRunMode
}
