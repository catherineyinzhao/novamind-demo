import { useCallback, useEffect, useRef, useState } from 'react'
import {
  initialPipelineState,
  PIPELINE_REPLAY,
  type PipelineState,
} from './pipelineReplayModel'

export function usePipelineReplay() {
  const [state, setState] = useState<PipelineState>(() => initialPipelineState())
  const [playing, setPlaying] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setPlaying(false)
    setState(initialPipelineState())
  }, [clearTimers])

  const play = useCallback(() => {
    clearTimers()
    setPlaying(true)
    setState(initialPipelineState())

    let t = 0
    PIPELINE_REPLAY.forEach((tick, i) => {
      t += tick.ms
      const id = setTimeout(() => {
        setState((prev) => {
          const next = structuredClone(prev)
          tick.patch(next)
          return next
        })
        if (i === PIPELINE_REPLAY.length - 1) {
          setPlaying(false)
        }
      }, t)
      timersRef.current.push(id)
    })
  }, [clearTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  return { state, playing, play, reset }
}
