import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PhaseEndEvent, StreamEvent } from '../shared/streamProtocol.ts'

describe('stream protocol shapes', () => {
  it('phase_end may include durationMs', () => {
    const line = '{"type":"phase_end","phase":"literature","durationMs":1234}'
    const evt = JSON.parse(line) as StreamEvent
    assert.equal(evt.type, 'phase_end')
    if (evt.type === 'phase_end') {
      const pe = evt as PhaseEndEvent
      assert.equal(pe.phase, 'literature')
      assert.equal(pe.durationMs, 1234)
    }
  })

  it('phase_start accepts citation phase', () => {
    const evt = JSON.parse(
      '{"type":"phase_start","phase":"citation","model":"claude-sonnet-4-5-20250929","langsmithChildId":"abc"}',
    ) as StreamEvent
    assert.equal(evt.type, 'phase_start')
    if (evt.type === 'phase_start') {
      assert.equal(evt.phase, 'citation')
    }
  })
})
