import { randomUUID } from 'node:crypto'
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { FeedKind, StreamEvent } from '../shared/streamProtocol.ts'

export type BetaFeedState = {
  indexToBlock: Map<number, { id: string; kind: FeedKind }>
  toolInputByIndex: Map<number, string>
  assembled: { text: string }
}

export function createBetaFeedState(assembled: { text: string }): BetaFeedState {
  return {
    indexToBlock: new Map(),
    toolInputByIndex: new Map(),
    assembled,
  }
}

function feedBlockTitle(titlePrefix: string, segment: string): string {
  const p = titlePrefix.trim()
  return p ? `${p} · ${segment}` : segment
}

function mapBetaStartKind(
  event: BetaRawContentBlockStartEvent,
  titlePrefix: string,
): { kind: FeedKind; title: string } | null {
  if (event.type !== 'content_block_start') return null
  const block = event.content_block
  switch (block.type) {
    case 'thinking':
      return { kind: 'thinking', title: feedBlockTitle(titlePrefix, 'Thinking') }
    case 'text':
      return { kind: 'text', title: feedBlockTitle(titlePrefix, 'Assistant') }
    case 'tool_use':
      return { kind: 'tool', title: feedBlockTitle(titlePrefix, `tool_use · ${block.name}`) }
    case 'mcp_tool_use':
      return {
        kind: 'tool',
        title: feedBlockTitle(titlePrefix, `mcp · ${block.server_name} · ${block.name}`),
      }
    case 'redacted_thinking':
      return { kind: 'thinking', title: feedBlockTitle(titlePrefix, 'Thinking (redacted)') }
    default: {
      const t = 'type' in block ? String(block.type) : 'block'
      return { kind: 'text', title: feedBlockTitle(titlePrefix, t) }
    }
  }
}

/** Maps one Beta stream_event payload to feed StreamEvents (streaming assistant turns). */
export function* betaStreamEventToFeed(
  event: BetaRawMessageStreamEvent,
  signal: AbortSignal,
  state: BetaFeedState,
  titlePrefix: string,
): Generator<StreamEvent> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

  if (event.type === 'message_start') {
    state.indexToBlock.clear()
    state.toolInputByIndex.clear()
    return
  }

  if (event.type === 'content_block_start') {
    const mapped = mapBetaStartKind(event, titlePrefix)
    if (!mapped) return
    const id = randomUUID()
    state.indexToBlock.set(event.index, { id, kind: mapped.kind })
    yield {
      type: 'block_start',
      id,
      blockKind: mapped.kind,
      title: mapped.title,
    }
    if (event.content_block.type === 'redacted_thinking') {
      yield { type: 'block_delta', id, text: '[Redacted thinking]' }
    }
    return
  }

  if (event.type === 'content_block_delta') {
    const meta = state.indexToBlock.get(event.index)
    if (!meta) return
    const d = event.delta
    if (d.type === 'text_delta') {
      state.assembled.text += d.text
      yield { type: 'block_delta', id: meta.id, text: d.text }
    } else if (d.type === 'thinking_delta') {
      yield { type: 'block_delta', id: meta.id, text: d.thinking }
    } else if (d.type === 'input_json_delta') {
      const piece = typeof d.partial_json === 'string' ? d.partial_json : ''
      state.toolInputByIndex.set(event.index, (state.toolInputByIndex.get(event.index) ?? '') + piece)
      yield { type: 'block_delta', id: meta.id, text: piece }
    }
    return
  }
}

/**
 * Emit feed blocks for assistant content that never streamed as `stream_event` partials
 * (common with Claude Agent SDK / CLI batching). Skips indices already mapped by streaming.
 */
export function* betaAssistantMessageToFeed(
  message: BetaMessage,
  state: BetaFeedState,
  titlePrefix: string,
): Generator<StreamEvent> {
  let i = 0
  for (const block of message.content) {
    if (state.indexToBlock.has(i)) {
      i++
      continue
    }

    if (block.type === 'text') {
      const body = block.text ?? ''
      const id = randomUUID()
      state.indexToBlock.set(i, { id, kind: 'text' })
      state.assembled.text += body
      yield {
        type: 'block_start',
        id,
        blockKind: 'text',
        title: feedBlockTitle(titlePrefix, 'Assistant'),
      }
      if (body) yield { type: 'block_delta', id, text: body }
    } else if (block.type === 'thinking') {
      const body = block.thinking ?? ''
      const id = randomUUID()
      state.indexToBlock.set(i, { id, kind: 'thinking' })
      yield {
        type: 'block_start',
        id,
        blockKind: 'thinking',
        title: feedBlockTitle(titlePrefix, 'Thinking'),
      }
      if (body) yield { type: 'block_delta', id, text: body }
    } else if (block.type === 'redacted_thinking') {
      const id = randomUUID()
      state.indexToBlock.set(i, { id, kind: 'thinking' })
      yield {
        type: 'block_start',
        id,
        blockKind: 'thinking',
        title: feedBlockTitle(titlePrefix, 'Thinking (redacted)'),
      }
      yield { type: 'block_delta', id, text: '[Redacted thinking]' }
    } else if (block.type === 'tool_use') {
      let full: string
      try {
        full = JSON.stringify(block.input ?? {}, null, 2)
      } catch {
        full = '{}'
      }
      const id = randomUUID()
      state.indexToBlock.set(i, { id, kind: 'tool' })
      state.toolInputByIndex.set(i, full)
      yield {
        type: 'block_start',
        id,
        blockKind: 'tool',
        title: feedBlockTitle(titlePrefix, `tool_use · ${block.name}`),
      }
      if (full) yield { type: 'block_delta', id, text: full }
    } else if (block.type === 'mcp_tool_use') {
      let full: string
      try {
        full = JSON.stringify(block.input ?? {}, null, 2)
      } catch {
        full = '{}'
      }
      const id = randomUUID()
      state.indexToBlock.set(i, { id, kind: 'tool' })
      state.toolInputByIndex.set(i, full)
      yield {
        type: 'block_start',
        id,
        blockKind: 'tool',
        title: feedBlockTitle(titlePrefix, `mcp · ${block.server_name} · ${block.name}`),
      }
      if (full) yield { type: 'block_delta', id, text: full }
    }

    i++
  }
}

/** Reconcile tool inputs from a completed Beta assistant message (fills gaps when streaming deltas were sparse). */
export function* betaFinalMessageToolTail(
  message: BetaMessage,
  state: BetaFeedState,
): Generator<StreamEvent> {
  let i = 0
  for (const block of message.content) {
    if (block.type === 'tool_use' || block.type === 'mcp_tool_use') {
      const meta = state.indexToBlock.get(i)
      if (meta?.kind === 'tool') {
        const streamed = (state.toolInputByIndex.get(i) ?? '').trim()
        let full: string
        try {
          full = JSON.stringify(block.input ?? {}, null, 2)
        } catch {
          full = '{}'
        }
        if (full.length > 0 && !streamed) {
          yield { type: 'block_delta', id: meta.id, text: full }
        } else if (full.length > streamed.length && streamed.length > 0 && full.startsWith(streamed)) {
          yield { type: 'block_delta', id: meta.id, text: full.slice(streamed.length) }
        }
      }
    }
    i++
  }
}

export function resetBetaFeedState(state: BetaFeedState): void {
  state.indexToBlock.clear()
  state.toolInputByIndex.clear()
}
