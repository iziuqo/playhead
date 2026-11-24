import type { Note } from './types'

/**
 * Game logic for Practice and the Daily Tune, independent of rendering.
 *
 * The UI calls `tick(nowMs)` every frame and `press(midi, nowMs)` on every key
 * press, then draws `songTime(nowMs)` and the judgements. Two modes:
 * - **flow**: the song keeps moving; late or wrong notes are missed.
 * - **wait**: the song pauses on each note until you play it (learning mode).
 */
export type Judgement = 'perfect' | 'good' | 'miss'
export type PracticeMode = 'flow' | 'wait'

export const PERFECT_WINDOW = 0.09
export const GOOD_WINDOW = 0.2
/** Seconds of falling notes before the first one reaches the keys. */
export const LEAD_IN = 2

export interface PracticeResult {
  perfect: number
  good: number
  miss: number
  /** 0–1, where a good counts half. */
  accuracy: number
  bestCombo: number
  /** One judgement per note, in song order (for the share grid). */
  judgements: Judgement[]
}

export class PracticeSession {
  readonly notes: readonly Note[]
  private readonly judged: (Judgement | undefined)[]
  private startMs = 0
  /** Total milliseconds the clock has been frozen (wait mode). */
  private pausedMs = 0
  private pausedSinceMs: number | undefined
  private combo = 0
  private bestCombo = 0

  constructor(
    notes: readonly Note[],
    readonly mode: PracticeMode = 'flow',
  ) {
    this.notes = [...notes].sort((a, b) => a.time - b.time)
    this.judged = this.notes.map(() => undefined)
  }

  start(nowMs: number): void {
    this.startMs = nowMs + LEAD_IN * 1000
  }

  /** Seconds into the song (negative during the lead-in). */
  songTime(nowMs: number): number {
    const frozenFor = this.pausedSinceMs === undefined ? 0 : nowMs - this.pausedSinceMs
    return (nowMs - this.startMs - this.pausedMs - frozenFor) / 1000
  }

  judgementOf(index: number): Judgement | undefined {
    return this.judged[index]
  }

  get currentCombo(): number {
    return this.combo
  }

  get isDone(): boolean {
    return this.judged.every(Boolean)
  }

  /** Advances time: freezes in wait mode, records misses in flow mode. */
  tick(nowMs: number): Judgement[] {
    const now = this.songTime(nowMs)
    if (this.mode === 'wait') {
      const waiting = this.notes.some((n, i) => !this.judged[i] && n.time <= now)
      if (waiting && this.pausedSinceMs === undefined) this.pausedSinceMs = nowMs
      return []
    }
    const misses: Judgement[] = []
    this.notes.forEach((note, i) => {
      if (!this.judged[i] && now > note.time + GOOD_WINDOW) {
        this.judge(i, 'miss')
        misses.push('miss')
      }
    })
    return misses
  }

  /** Scores a key press. Returns undefined for a stray press (no penalty). */
  press(midi: number, nowMs: number): { index: number; judgement: Judgement } | undefined {
    const now = this.songTime(nowMs)
    let best: number | undefined
    let bestDistance = Infinity
    this.notes.forEach((note, i) => {
      if (this.judged[i] || note.midi !== midi) return
      const distance = Math.abs(note.time - now)
      if (distance < bestDistance) [best, bestDistance] = [i, distance]
    })

    const inWaitForThisNote = this.mode === 'wait' && this.pausedSinceMs !== undefined
    if (best === undefined || (!inWaitForThisNote && bestDistance > GOOD_WINDOW)) return undefined
    if (inWaitForThisNote && this.notes[best]!.time > now + GOOD_WINDOW) return undefined

    const judgement: Judgement =
      inWaitForThisNote || bestDistance <= PERFECT_WINDOW ? 'perfect' : 'good'
    this.judge(best, judgement)

    // Release the frozen clock once every due note has been played.
    if (this.pausedSinceMs !== undefined) {
      const stillWaiting = this.notes.some((n, i) => !this.judged[i] && n.time <= now)
      if (!stillWaiting) {
        this.pausedMs += nowMs - this.pausedSinceMs
        this.pausedSinceMs = undefined
      }
    }
    return { index: best, judgement }
  }

  result(): PracticeResult {
    const judgements = this.judged.map((j) => j ?? 'miss')
    const count = (kind: Judgement) => judgements.filter((j) => j === kind).length
    const [perfect, good, miss] = [count('perfect'), count('good'), count('miss')]
    const accuracy = judgements.length ? (perfect + good / 2) / judgements.length : 0
    return { perfect, good, miss, accuracy, bestCombo: this.bestCombo, judgements }
  }

  private judge(index: number, judgement: Judgement): void {
    this.judged[index] = judgement
    this.combo = judgement === 'miss' ? 0 : this.combo + 1
    this.bestCombo = Math.max(this.bestCombo, this.combo)
  }
}

/** Wordle-style emoji grid for sharing a result as plain text. */
export const judgementEmoji = (judgements: readonly Judgement[]): string =>
  judgements.map((j) => (j === 'perfect' ? '🟩' : j === 'good' ? '🟨' : '⬛')).join('')
