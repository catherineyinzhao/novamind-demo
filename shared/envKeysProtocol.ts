/** GET /api/env-keys — booleans only; never exposes secret values. */

export type EnvKeysResponse = {
  live: {
    anthropic: boolean
    langsmith: boolean
    braintrust: boolean
  }
}
