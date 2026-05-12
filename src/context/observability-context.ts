import { createContext } from 'react'
import type { ObservabilityConfig } from '../types/observability'

export type ObservabilityConfigApi = {
  config: ObservabilityConfig
  setConfig: (patch: Partial<ObservabilityConfig>) => void
  reset: () => void
}

export const ObservabilityConfigContext = createContext<ObservabilityConfigApi | null>(null)
