import type { LangSmithRegion, ObservabilityConfig } from '../types/observability'

const LANGSMITH_HOST: Record<LangSmithRegion, string> = {
  us: 'https://smith.langchain.com',
  eu: 'https://eu.smith.langchain.com',
}

/**
 * Deep link to a single run/trace in LangSmith.
 * Pattern: /o/{tenant}/projects/p/{projectUuid}/r/{runUuid}
 */
export function langSmithRunUrl(
  tenantId: string,
  projectId: string,
  runId: string,
  region: LangSmithRegion = 'us',
): string | null {
  if (!tenantId?.trim() || !projectId?.trim() || !runId?.trim()) return null
  const base = LANGSMITH_HOST[region]
  const t = encodeURIComponent(tenantId.trim())
  const p = encodeURIComponent(projectId.trim())
  const r = encodeURIComponent(runId.trim())
  return `${base}/o/${t}/projects/p/${p}/r/${r}`
}

/** Project-level traces list (no specific run). */
export function langSmithProjectUrl(
  tenantId: string,
  projectId: string,
  region: LangSmithRegion = 'us',
): string | null {
  if (!tenantId?.trim() || !projectId?.trim()) return null
  const base = LANGSMITH_HOST[region]
  const t = encodeURIComponent(tenantId.trim())
  const p = encodeURIComponent(projectId.trim())
  return `${base}/o/${t}/projects/p/${p}`
}

/**
 * Braintrust experiment page.
 * Pattern: /app/{org}/p/{project}/experiments/{experimentId}
 */
export function braintrustExperimentUrl(
  org: string,
  project: string,
  experimentId: string,
): string | null {
  if (!org?.trim() || !project?.trim() || !experimentId?.trim()) return null
  const o = encodeURIComponent(org.trim())
  const p = encodeURIComponent(project.trim())
  const e = encodeURIComponent(experimentId.trim())
  return `https://www.braintrust.dev/app/${o}/p/${p}/experiments/${e}`
}

/** Braintrust project root (logs / experiments list). */
export function braintrustProjectUrl(org: string, project: string): string | null {
  if (!org?.trim() || !project?.trim()) return null
  const o = encodeURIComponent(org.trim())
  const p = encodeURIComponent(project.trim())
  return `https://www.braintrust.dev/app/${o}/p/${p}`
}

export function resolvedLinks(cfg: ObservabilityConfig) {
  const btExp = braintrustExperimentUrl(
    cfg.braintrustOrg,
    cfg.braintrustProject,
    cfg.braintrustExperimentId,
  )
  const btProj = braintrustProjectUrl(cfg.braintrustOrg, cfg.braintrustProject)
  const lsRun = langSmithRunUrl(
    cfg.langSmithTenantId,
    cfg.langSmithProjectId,
    cfg.langSmithRunId,
    cfg.langSmithRegion,
  )
  const lsProj = langSmithProjectUrl(
    cfg.langSmithTenantId,
    cfg.langSmithProjectId,
    cfg.langSmithRegion,
  )
  return { btExp, btProj, lsRun, lsProj }
}
