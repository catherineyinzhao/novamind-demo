import { randomUUID } from 'node:crypto'
import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { FeedKind, PipelinePhase, StreamEvent } from '../shared/streamProtocol.ts'
import {
  MCP_SERVER_NAME,
  MCP_TOOL_DEMO_TRAJECTORY,
  MCP_TOOL_EXPERIMENT,
  MCP_TOOL_PUBMED,
  MCP_TOOL_VERIFY_PMIDS,
} from './researchPrompts.ts'

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

const MCP_TOOL_USE_PREFIX = `mcp__${MCP_SERVER_NAME}__`

/** Pipeline-only: map Novamind MCP tool to feed phase (orchestrator never calls MCP in pipeline mode). */
export function inferPipelinePhaseFromMcpTool(
  serverName: string,
  toolName: string,
): Extract<PipelinePhase, 'literature' | 'data' | 'citation'> | undefined {
  if (serverName !== MCP_SERVER_NAME) return undefined
  if (toolName === MCP_TOOL_PUBMED || toolName === 'query_pubmed_corpus') return 'literature'
  if (toolName === MCP_TOOL_EXPERIMENT || toolName === 'fetch_experiment_summary') return 'data'
  if (toolName === MCP_TOOL_DEMO_TRAJECTORY || toolName === 'demo_endpoint_trajectory') return 'data'
  if (toolName === MCP_TOOL_VERIFY_PMIDS || toolName === 'verify_claimed_pmids') return 'citation'
  return undefined
}

/**
 * Some streams surface Novamind MCP as `tool_use` with a fully-qualified name
 * (e.g. `mcp__novamind__query_pubmed_corpus`) instead of `mcp_tool_use`.
 */
export function inferPipelinePhaseFromMcpToolUseName(
  toolName: string,
): Extract<PipelinePhase, 'literature' | 'data' | 'citation'> | undefined {
  if (toolName === MCP_TOOL_PUBMED || toolName === 'query_pubmed_corpus') return 'literature'
  if (toolName === MCP_TOOL_EXPERIMENT || toolName === 'fetch_experiment_summary') return 'data'
  if (toolName === MCP_TOOL_DEMO_TRAJECTORY || toolName === 'demo_endpoint_trajectory') return 'data'
  if (toolName === MCP_TOOL_VERIFY_PMIDS || toolName === 'verify_claimed_pmids') return 'citation'
  if (toolName.startsWith(MCP_TOOL_USE_PREFIX)) {
    const suffix = toolName.slice(MCP_TOOL_USE_PREFIX.length)
    if (suffix === 'query_pubmed_corpus') return 'literature'
    if (suffix === 'fetch_experiment_summary') return 'data'
    if (suffix === 'demo_endpoint_trajectory') return 'data'
    if (suffix === 'verify_claimed_pmids') return 'citation'
  }
  return undefined
}

export function inferPipelinePhaseFromMcpStreamEvent(
  event: BetaRawMessageStreamEvent,
): Extract<PipelinePhase, 'literature' | 'data' | 'citation'> | undefined {
  if (event.type !== 'content_block_start') return undefined
  const block = event.content_block
  if (block.type === 'mcp_tool_use') {
    return inferPipelinePhaseFromMcpTool(block.server_name, block.name)
  }
  if (block.type === 'tool_use') {
    return inferPipelinePhaseFromMcpToolUseName(block.name)
  }
  return undefined
}

function mapBetaStartKind(
  event: BetaRawMessageStreamEvent,
  titlePrefix: string,
): { kind: FeedKind; title: string } | null {
  if (event.type !== 'content_block_start') return null
  const block = event.content_block
  switch (block.type) {
    case 'thinking':
      return { kind: 'thinking', title: feedBlockTitle(titlePrefix, 'Thinking') }
    case 'text':
      return { kind: 'text', title: feedBlockTitle(titlePrefix, 'Assistant') }
    case 'tool_use': {
      const toolSeg =
        block.name === 'Agent' ? `tool_use · ${block.name} (delegate)` : `tool_use · ${block.name}`
      return { kind: 'tool', title: feedBlockTitle(titlePrefix, toolSeg) }
    }
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
  actorPhase: PipelinePhase | undefined,
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
      ...(actorPhase ? { actorPhase } : {}),
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
  actorPhase: PipelinePhase | undefined,
  pipelineMcpInference?: boolean,
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
        ...(actorPhase ? { actorPhase } : {}),
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
        ...(actorPhase ? { actorPhase } : {}),
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
        ...(actorPhase ? { actorPhase } : {}),
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
      const toolSeg =
        block.name === 'Agent' ? `tool_use · ${block.name} (delegate)` : `tool_use · ${block.name}`
      const inferred =
        pipelineMcpInference === true ? inferPipelinePhaseFromMcpToolUseName(block.name) : undefined
      const blockTitlePrefix =
        inferred === 'literature'
          ? 'Literature review'
          : inferred === 'data'
            ? 'Data analysis'
            : inferred === 'citation'
              ? 'Citation audit'
              : titlePrefix
      const blockActorPhase: PipelinePhase | undefined = inferred ?? actorPhase
      yield {
        type: 'block_start',
        id,
        blockKind: 'tool',
        title: feedBlockTitle(blockTitlePrefix, toolSeg),
        ...(blockActorPhase ? { actorPhase: blockActorPhase } : {}),
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
      const inferred =
        pipelineMcpInference === true
          ? inferPipelinePhaseFromMcpTool(block.server_name, block.name)
          : undefined
      const blockTitlePrefix =
        inferred === 'literature'
          ? 'Literature review'
          : inferred === 'data'
            ? 'Data analysis'
            : inferred === 'citation'
              ? 'Citation audit'
              : titlePrefix
      const blockActorPhase: PipelinePhase | undefined = inferred ?? actorPhase
      yield {
        type: 'block_start',
        id,
        blockKind: 'tool',
        title: feedBlockTitle(blockTitlePrefix, `mcp · ${block.server_name} · ${block.name}`),
        ...(blockActorPhase ? { actorPhase: blockActorPhase } : {}),
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
