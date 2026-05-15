import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import type { Application } from 'express'
import { createApp } from './createApp.ts'

const KEY_NAMES = [
  'ANTHROPIC_API_KEY',
  'LANGSMITH_API_KEY',
  'LANGCHAIN_API_KEY',
  'BRAINTRUST_API_KEY',
] as const

function stripKeysForTest(): () => void {
  const prev: Partial<Record<(typeof KEY_NAMES)[number], string | undefined>> = {}
  for (const k of KEY_NAMES) {
    prev[k] = process.env[k]
    delete process.env[k]
  }
  return () => {
    for (const k of KEY_NAMES) {
      if (prev[k] === undefined) delete process.env[k]
      else process.env[k] = prev[k]!
    }
  }
}

describe('API smoke', () => {
  let app: Application
  let server: ReturnType<Application['listen']>
  let baseUrl: string

  before(() => {
    app = createApp()
    return new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        if (!addr || typeof addr === 'string') {
          reject(new Error('expected tcp AddressInfo'))
          return
        }
        baseUrl = `http://127.0.0.1:${(addr as AddressInfo).port}`
        resolve()
      })
      server.once('error', reject)
    })
  })

  after(() => {
    return new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  })

  it('GET /api/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.status, 200)
    const j = (await res.json()) as { ok?: boolean }
    assert.equal(j.ok, true)
  })

  it('GET /api/env-keys returns presence flags', async () => {
    const res = await fetch(`${baseUrl}/api/env-keys`)
    assert.equal(res.status, 200)
    const j = (await res.json()) as {
      live?: { anthropic?: boolean; langsmith?: boolean; braintrust?: boolean }
    }
    assert.ok(j.live)
    assert.equal(typeof j.live.anthropic, 'boolean')
    assert.equal(typeof j.live.langsmith, 'boolean')
    assert.equal(typeof j.live.braintrust, 'boolean')
  })

  it('POST /api/agent/stream returns NDJSON lines ending with done (no keys)', async () => {
    const restore = stripKeysForTest()
    try {
      const res = await fetch(`${baseUrl}/api/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'hello',
          braintrustProject: 'Global',
        }),
      })
      assert.equal(res.status, 200)
      assert.match(res.headers.get('content-type') || '', /application\/x-ndjson/)
      const text = await res.text()
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      assert.ok(lines.length >= 2, 'expected at least one event plus done')
      const parsed = lines.map((l) => JSON.parse(l) as { type: string })
      assert.equal(parsed.at(-1)?.type, 'done')
      assert.ok(parsed.some((x) => x.type === 'error'), 'expected error when keys are absent')
    } finally {
      restore()
    }
  })
})
