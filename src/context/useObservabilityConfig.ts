import { useContext } from 'react'
import { ObservabilityConfigContext } from './observability-context'

export function useObservabilityConfig() {
  const ctx = useContext(ObservabilityConfigContext)
  if (!ctx) throw new Error('useObservabilityConfig must be used within ObservabilityConfigProvider')
  return ctx
}
