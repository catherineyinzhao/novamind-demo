const KEY = 'novamind-obs-config-v2'

export function loadJson<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

export function saveJson<T>(value: T): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}
