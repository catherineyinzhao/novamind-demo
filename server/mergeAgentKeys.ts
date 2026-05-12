import type { AgentStreamRequest } from '../shared/streamProtocol.ts'

/**
 * Request body values win over env. Empty / omitted body fields fall back to process.env.
 *
 * LangSmith accepts LANGSMITH_API_KEY or the common LANGCHAIN_API_KEY alias.
 */
export function mergeAgentKeys(body: AgentStreamRequest): AgentStreamRequest {
  const anthropicApiKey =
    body.anthropicApiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || ''
  const langsmithApiKey =
    body.langsmithApiKey?.trim() ||
    process.env.LANGSMITH_API_KEY?.trim() ||
    process.env.LANGCHAIN_API_KEY?.trim() ||
    ''
  const braintrustApiKey =
    body.braintrustApiKey?.trim() || process.env.BRAINTRUST_API_KEY?.trim() || ''

  const orchestratorModel =
    body.orchestratorModel?.trim() || process.env.ANTHROPIC_ORCHESTRATOR_MODEL?.trim() || undefined

  const subagentModel = body.subagentModel?.trim() || process.env.ANTHROPIC_SUBAGENT_MODEL?.trim() || undefined

  return {
    ...body,
    anthropicApiKey,
    langsmithApiKey,
    braintrustApiKey,
    orchestratorModel,
    subagentModel,
  }
}
