import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioEngine, KEY_TO_SEMITONE, OCTAVE_DOWN_CODE, OCTAVE_UP_CODE, SUSTAIN_CODE,
  type Melody, type Note, type Timbre,
} from '../core'

/** Default chime: a C major 9 arpeggio, high and soft. */
const CHIME = [72, 76, 79, 83, 86] as const
/** Seconds between chime notes. */
const CHIME_STEP = 0.07
import { SAMPLE_URLS } from './samples'

/** What the note stage listens to. `at` is performance.now() in ms. */
export interface NoteSignal {
  type: 'on' | 'off'
  midi: number
  velocity: number
  at: number
}
type Listener = (signal: NoteSignal) => void

interface Options {
  /** Lowest and highest playable MIDI notes (the visible keyboard). */
  range: [number, number]
  /** Called for every note a person plays (not for playback). */
  onPlayed?: (midi: number) => void
}

/**
 * The piano's brain for React: owns the sound engine, which keys are down,
 * computer-keyboard input, recording and melody playback.
 *
 * Re-renders only when the set of pressed keys changes; per-frame visuals
 * subscribe through `subscribe` instead of React state.
 */
export function usePiano({ range, onPlayed }: Options) {
  const engineRef = useRef<AudioEngine>()
  const listeners = useRef(new Set<Listener>())
  const onPlayedRef = useRef(onPlayed)
  onPlayedRef.current = onPlayed

  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set())
  const [ready, setReady] = useState(false)
  const [baseOctaveC, setBaseOctaveC] = useState(60)
  const [timbre, setTimbreState] = useState<Timbre>('grand')
  const [recording, setRecording] = useState(false)
  const take = useRef<{ startedAt: number; notes: Note[]; open: Map<number, Note> }>()
  const playbackTimers = useRef<number[]>([])

  // Create the engine once and decode samples in the background.
  useEffect(() => {
    const engine = new AudioEngine()
    engineRef.current = engine
    engine.loadSamples(SAMPLE_URLS).then(() => setReady(true), console.error)
    return () => void engine.context.close()
  }, [])

  const emit = (signal: NoteSignal) => listeners.current.forEach((fn) => fn(signal))

  const setKey = (midi: number, down: boolean) =>
    setPressed((prev) => {
      if (prev.has(midi) === down) return prev
      const next = new Set(prev)
      if (down) next.add(midi)
      else next.delete(midi)
      return next
    })

  /** A person pressed a key (mouse, touch or computer keyboard). */
  const press = useCallback((midi: number, velocity = 0.8) => {
    const engine = engineRef.current
    if (!engine) return
    void engine.unlock()
    engine.noteOn(midi, velocity)
    setKey(midi, true)
    emit({ type: 'on', midi, velocity, at: performance.now() })
    onPlayedRef.current?.(midi)

    if (take.current) {
      const note: Note = { midi, velocity, time: (performance.now() - take.current.startedAt) / 1000, duration: 0.1 }
      take.current.notes.push(note)
      take.current.open.set(midi, note)
    }
  }, [])

  const release = useCallback((midi: number) => {
    engineRef.current?.noteOff(midi)
    setKey(midi, false)
    emit({ type: 'off', midi, velocity: 0, at: performance.now() })
    const open = take.current?.open.get(midi)
    if (open && take.current) {
      open.duration = Math.max(0.08, (performance.now() - take.current.startedAt) / 1000 - open.time)
      take.current.open.delete(midi)
    }
  }, [])

  /** Plays a melody through the speakers and the visuals (demo, shared links). */
  const playMelody = useCallback((melody: Melody, onEnd?: () => void) => {
    const engine = engineRef.current
    if (!engine) return
    stopPlayback()
    void engine.unlock()
    const schedule = (ms: number, fn: () => void) => playbackTimers.current.push(window.setTimeout(fn, ms))
    for (const note of melody.notes) {
      schedule(note.time * 1000, () => {
        engine.noteOn(note.midi, note.velocity)
        setKey(note.midi, true)
        emit({ type: 'on', midi: note.midi, velocity: note.velocity, at: performance.now() })
      })
      schedule((note.time + note.duration) * 1000, () => {
        engine.noteOff(note.midi)
        setKey(note.midi, false)
        emit({ type: 'off', midi: note.midi, velocity: 0, at: performance.now() })
      })
    }
    const end = Math.max(0, ...melody.notes.map((n) => n.time + n.duration))
    schedule(end * 1000 + 300, () => onEnd?.())
  }, [])

  const stopPlayback = useCallback(() => {
    playbackTimers.current.forEach(clearTimeout)
    playbackTimers.current = []
    engineRef.current?.panic()
    setPressed(new Set())
  }, [])

  const startRecording = useCallback(() => {
    take.current = { startedAt: performance.now(), notes: [], open: new Map() }
    setRecording(true)
  }, [])

  /** Stops recording and returns the take, trimmed so it starts at 0. */
  const stopRecording = useCallback((): Note[] => {
    const notes = take.current?.notes ?? []
    take.current = undefined
    setRecording(false)
    const offset = notes[0]?.time ?? 0
    return notes.map((n) => ({ ...n, time: n.time - offset }))
  }, [])

  const setTimbre = useCallback((next: Timbre) => {
    if (engineRef.current) engineRef.current.timbre = next
    setTimbreState(next)
  }, [])

  // Computer keyboard: home row = white keys, row above = black keys.
  useEffect(() => {
    const held = new Map<string, number>()
    const [low, high] = range
    const isTyping = (e: KeyboardEvent) =>
      e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest?.('input, textarea, select')

    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.repeat) return
      if (e.code === OCTAVE_DOWN_CODE) return setBaseOctaveC((c) => Math.max(low - (low % 12), c - 12))
      if (e.code === OCTAVE_UP_CODE) return setBaseOctaveC((c) => Math.min(high - 12, c + 12))
      if (e.code === SUSTAIN_CODE) {
        e.preventDefault()
        return engineRef.current?.setSustain(true)
      }
      const semitone = KEY_TO_SEMITONE[e.code]
      if (semitone === undefined) return
      e.preventDefault()
      const midi = baseOctaveC + semitone
      if (midi < low || midi > high) return
      held.set(e.code, midi)
      press(midi)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === SUSTAIN_CODE) return engineRef.current?.setSustain(false)
      const midi = held.get(e.code)
      if (midi === undefined) return
      held.delete(e.code)
      release(midi)
    }
    const blur = () => held.forEach((midi) => release(midi))

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [range, baseOctaveC, press, release])

  /**
   * Plays a quiet rising arpeggio, sound only (no keys or trails light up).
   * Does nothing until audio is unlocked by a real gesture, so a hover can
   * never queue sound that bursts out later.
   */
  const chime = useCallback((midis: readonly number[] = CHIME) => {
    const engine = engineRef.current
    if (!engine || engine.context.state !== 'running') return
    const start = engine.context.currentTime
    midis.forEach((midi, i) => {
      const when = start + i * CHIME_STEP
      engine.noteOn(midi, 0.28, when)
      engine.noteOff(midi, when + 0.6)
    })
  }, [])

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn)
    return () => void listeners.current.delete(fn)
  }, [])

  return useMemo(
    () => ({
      ready, pressed, baseOctaveC, timbre, recording,
      press, release, chime, playMelody, stopPlayback, startRecording, stopRecording, setTimbre, subscribe,
    }),
    [ready, pressed, baseOctaveC, timbre, recording, press, release, chime, playMelody, stopPlayback, startRecording, stopRecording, setTimbre, subscribe],
  )
}

export type Piano = ReturnType<typeof usePiano>
