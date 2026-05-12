import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import type { AgentStreamRequest } from '../shared/streamProtocol.ts'
import { mergeAgentKeys } from './mergeAgentKeys.ts'
import { runAgentStream } from './agentStream.ts'
import { getEnvKeysPresence } from './envKeyPresence.ts'

const PORT = Number(process.env.PORT) || 8787

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.post('/api/agent/stream', async (req, res) => {
  const ac = new AbortController()
  /** Never use `req.on('close')` here — with JSON bodies, Express finishes reading the body and `close` can fire before the response streams, aborting the Agent SDK stream immediately. */
  const onClientDisconnected = () => {
    if (!res.writableEnded) ac.abort()
  }
  res.on('close', onClientDisconnected)

  res.status(200)
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders?.()

  try {
    const body = mergeAgentKeys(req.body as AgentStreamRequest)
    for await (const evt of runAgentStream(body, ac.signal)) {
      res.write(`${JSON.stringify(evt)}\n`)
      if (evt.type === 'done') break
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    res.write(`${JSON.stringify({ type: 'error', message })}\n`)
    res.write(`${JSON.stringify({ type: 'done' })}\n`)
  } finally {
    res.removeListener('close', onClientDisconnected)
  }
  res.end()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/** Reports which keys exist in server env (no values). Used by the UI to show “from .env”. */
app.get('/api/env-keys', (_req, res) => {
  res.json(getEnvKeysPresence())
})

app.listen(PORT, () => {
  console.log(`[novamind-demo] API listening on http://localhost:${PORT}`)
})
