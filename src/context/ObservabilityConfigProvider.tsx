import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { ObservabilityConfig } from '../types/observability'
import { defaultObservabilityConfig } from '../types/observability'
import { loadJson, saveJson } from '../lib/storage'
import { ObservabilityConfigContext } from './observability-context'

export function ObservabilityConfigProvider({ children }: { children: ReactNode }) {
  const [config, setState] = useState<ObservabilityConfig>(() =>
    loadJson(defaultObservabilityConfig()),
  )

  const setConfig = useCallback((patch: Partial<ObservabilityConfig>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveJson(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const base = defaultObservabilityConfig()
    saveJson(base)
    setState(base)
  }, [])

  const value = useMemo(
    () => ({
      config,
      setConfig,
      reset,
    }),
    [config, setConfig, reset],
  )

  return (
    <ObservabilityConfigContext.Provider value={value}>{children}</ObservabilityConfigContext.Provider>
  )
}
