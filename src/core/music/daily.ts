import { scaleNote } from './scales'
import type { Note } from './types'
import type { Song } from './songs'

/**
 * The Daily Tune: one short melody per calendar day, identical for everyone,
 * generated from the date alone (no server). Like Wordle, the puzzle number is
 * days since launch.
 */
export const LAUNCH_DAY = Date.UTC(2026, 10, 24)
const DAY_MS = 86_400_000

/** Puzzle number for a date (1 on launch day). Uses the player's local date. */
export function dailyNumber(date = new Date()): number {
  const localMidnightUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((localMidnightUtc - LAUNCH_DAY) / DAY_MS) + 1
}

/** Small, fast, seedable PRNG (mulberry32). Same seed → same sequence. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** Builds the tune for a puzzle number: 10 notes, pentatonic, mostly stepwise. */
export function dailyTune(number: number): Song {
  const random = seededRandom(number * 9973)
  const beat = 60 / 104
  const notes: Note[] = []
  let degree = 2
  let time = 0
  for (let i = 0; i < 10; i++) {
    const leap = random() < 0.2 ? 3 : 1
    degree = Math.min(7, Math.max(0, degree + (random() < 0.5 ? -leap : leap)))
    const beats = i === 9 ? 2 : random() < 0.3 ? 0.5 : 1
    notes.push({ midi: scaleNote(60, 'pentatonic', degree), time, duration: beats * beat * 0.92, velocity: 0.8 })
    time += beats * beat
  }
  return { id: `daily-${number}`, title: `Daily Tune #${number}`, composer: 'Playhead', difficulty: 1, notes }
}
