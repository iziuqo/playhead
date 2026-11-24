import { useCallback, useEffect, useRef, useState } from 'react'
import { PracticeSession, type Judgement, type PracticeMode, type PracticeResult, type Song } from '../core'

/** How far ahead (seconds) a note starts glowing on the keyboard as a hint. */
const GUIDE_LOOKAHEAD = 0.35

export type GamePhase = 'idle' | 'running' | 'done'

/**
 * Runs one Practice or Daily round: owns the session, ticks it every frame,
 * scores key presses and reports the result. Rendering lives in <Stage>.
 */
export function useGame(onFinish?: (song: Song, result: PracticeResult) => void) {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [song, setSong] = useState<Song>()
  const [session, setSession] = useState<PracticeSession>()
  const [result, setResult] = useState<PracticeResult>()
  const [guide, setGuide] = useState<ReadonlySet<number>>(new Set())
  const [feedback, setFeedback] = useState<{ judgement: Judgement; combo: number; id: number }>()
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const start = useCallback((next: Song, mode: PracticeMode) => {
    const s = new PracticeSession(next.notes, mode)
    s.start(performance.now())
    setSong(next)
    setSession(s)
    setResult(undefined)
    setPhase('running')
  }, [])

  const stop = useCallback(() => {
    setSession(undefined)
    setPhase('idle')
    setGuide(new Set())
  }, [])

  // Per-frame loop: advance time, collect misses, update hints, detect the end.
  useEffect(() => {
    if (!session || phase !== 'running') return
    let frame = 0
    let guideKey = ''
    const loop = () => {
      const now = performance.now()
      if (session.tick(now).length) setFeedback({ judgement: 'miss', combo: 0, id: now })
      const t = session.songTime(now)
      const upcoming = session.notes
        .filter((n, i) => !session.judgementOf(i) && n.time - t < GUIDE_LOOKAHEAD && n.time - t > -0.3)
        .map((n) => n.midi)
      const key = upcoming.join(',')
      if (key !== guideKey) setGuide(new Set(upcoming)), (guideKey = key)
      if (session.isDone) {
        const r = session.result()
        setResult(r)
        setPhase('done')
        setGuide(new Set())
        if (song) onFinishRef.current?.(song, r)
        return
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [session, phase, song])

  /** Feed every played note in; returns nothing, updates feedback. */
  const onPlayed = useCallback(
    (midi: number) => {
      if (!session || phase !== 'running') return
      const hit = session.press(midi, performance.now())
      if (hit) setFeedback({ judgement: hit.judgement, combo: session.currentCombo, id: performance.now() })
    },
    [session, phase],
  )

  return { phase, song, session, result, guide, feedback, start, stop, onPlayed }
}
