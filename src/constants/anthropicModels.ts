/**
 * Preset model ids for the Live tab dropdown (aligns with @anthropic-ai/sdk Model union).
 * Empty value → server uses ANTHROPIC_MODEL or its built-in default.
 */
export const ANTHROPIC_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Server default' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
]

/** Matches server `agentStream` fallback when `ANTHROPIC_MODEL` is unset — used to resolve “Server default” in the UI. */
export const DEFAULT_LIVE_MODEL = 'claude-sonnet-4-6'

// Keep in sync with Anthropic’s extended-thinking compatibility for each model id.
const EXTENDED_THINKING_MODEL_IDS = new Set<string>([
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5',
])

export function resolveLiveSingleModelId(selected: string): string {
  const t = selected.trim()
  return t || DEFAULT_LIVE_MODEL
}

export function modelSupportsExtendedThinking(resolvedModelId: string): boolean {
  return EXTENDED_THINKING_MODEL_IDS.has(resolvedModelId.trim())
}
