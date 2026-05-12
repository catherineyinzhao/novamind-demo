import type { EnvKeysResponse } from '../shared/envKeysProtocol.ts'

function langsmithFromEnv(): boolean {
  return !!(process.env.LANGSMITH_API_KEY?.trim() || process.env.LANGCHAIN_API_KEY?.trim())
}

/** Which API keys are set in process.env (same rules as mergeAgentKeys). */
export function getEnvKeysPresence(): EnvKeysResponse {
  return {
    live: {
      anthropic: !!process.env.ANTHROPIC_API_KEY?.trim(),
      langsmith: langsmithFromEnv(),
      braintrust: !!process.env.BRAINTRUST_API_KEY?.trim(),
    },
  }
}
