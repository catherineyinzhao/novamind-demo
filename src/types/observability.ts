/** LangSmith tenant id used in dashboard URLs (organization id). */
export type LangSmithRegion = 'us' | 'eu'

export interface ObservabilityConfig {
  /** Braintrust organization slug as shown in dashboard URLs */
  braintrustOrg: string
  /** Braintrust project slug */
  braintrustProject: string
  /** Stable experiment id (not display name) for deep links */
  braintrustExperimentId: string
  /** LangSmith organization / tenant id for URL path segment `o/{tenant}` */
  langSmithTenantId: string
  /** LangSmith project uuid (projects/p/{uuid}) */
  langSmithProjectId: string
  /** Optional explicit run id when you know it (e.g. after API creates a run) */
  langSmithRunId: string
  langSmithRegion: LangSmithRegion
}

export const defaultObservabilityConfig = (): ObservabilityConfig => ({
  braintrustOrg: '',
  braintrustProject: '',
  braintrustExperimentId: '',
  langSmithTenantId: '',
  langSmithProjectId: '',
  langSmithRunId: '',
  langSmithRegion: 'us',
})
