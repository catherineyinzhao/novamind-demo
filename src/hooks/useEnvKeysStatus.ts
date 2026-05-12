import { useEffect, useState } from 'react'
import type { EnvKeysResponse } from '../../shared/envKeysProtocol.ts'

const RETRIES = 8
const RETRY_MS = 250

async function fetchEnvKeysOnce(): Promise<EnvKeysResponse> {
  const res = await fetch('/api/env-keys')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as EnvKeysResponse
}

/** Retries tolerate API boot lag when Vite loads before Express is listening. */
async function fetchEnvKeysWithRetry(): Promise<EnvKeysResponse> {
  let last: unknown
  for (let i = 0; i < RETRIES; i++) {
    try {
      return await fetchEnvKeysOnce()
    } catch (e) {
      last = e
      if (i < RETRIES - 1) await new Promise((r) => setTimeout(r, RETRY_MS))
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

export function useEnvKeysStatus() {
  const [data, setData] = useState<EnvKeysResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const json = await fetchEnvKeysWithRetry()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setData(null)
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
