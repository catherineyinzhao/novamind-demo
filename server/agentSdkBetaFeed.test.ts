import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { MessageParam } from '@anthropic-ai/sdk/resources'
import {
  betaUserMessageToFeed,
  createBetaFeedState,
  extractToolResultText,
} from './agentSdkBetaFeed.ts'
import { parseCitationVerifyPayload } from '../shared/citationVerifyParse.ts'

describe('citationVerifyParse', () => {
  it('parses verify_claimed_pmids JSON', () => {
    const body = JSON.stringify({
      admissible: ['123', '456'],
      unknown_or_hallucinated: ['999'],
      session_corpus_hits: 2,
    })
    const p = parseCitationVerifyPayload(body)
    assert.ok(p)
    assert.deepEqual(p.admissible, ['123', '456'])
    assert.deepEqual(p.unknown_or_hallucinated, ['999'])
    assert.equal(p.session_corpus_hits, 2)
  })
})

describe('betaUserMessageToFeed', () => {
  it('emits tool_result for user message tool_result blocks', () => {
    const state = createBetaFeedState({ text: '' })
    state.toolUseIdToMeta.set('tu_1', { toolName: 'verify_claimed_pmids', serverName: 'novamind' })
    const msg: MessageParam = {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu_1',
          content: JSON.stringify({ admissible: ['1'], unknown_or_hallucinated: [] }),
        },
      ],
    }
    const events = [...betaUserMessageToFeed(msg, state, 'Citation audit', 'citation', true)]
    const start = events.find((e) => e.type === 'block_start' && e.blockKind === 'tool_result')
    assert.ok(start)
    assert.equal(start.type, 'block_start')
    if (start.type === 'block_start') {
      assert.match(start.title, /verify_claimed_pmids/)
    }
    const delta = events.find((e) => e.type === 'block_delta')
    assert.ok(delta)
    if (delta?.type === 'block_delta') {
      assert.match(delta.text, /admissible/)
    }
  })

  it('dedupes duplicate tool_result for same tool_use_id', () => {
    const state = createBetaFeedState({ text: '' })
    const msg: MessageParam = {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu_dup',
          content: '{"admissible":[],"unknown_or_hallucinated":[]}',
        },
      ],
    }
    const first = [...betaUserMessageToFeed(msg, state, 'Citation audit', 'citation', true)]
    const second = [...betaUserMessageToFeed(msg, state, 'Citation audit', 'citation', true)]
    const startsFirst = first.filter((e) => e.type === 'block_start' && e.blockKind === 'tool_result')
    const startsSecond = second.filter((e) => e.type === 'block_start' && e.blockKind === 'tool_result')
    assert.equal(startsFirst.length, 1)
    assert.equal(startsSecond.length, 0)
  })
})

describe('extractToolResultText', () => {
  it('joins text block array content', () => {
    const t = extractToolResultText([{ type: 'text', text: '{"a":1}' }])
    assert.equal(t, '{"a":1}')
  })
})
