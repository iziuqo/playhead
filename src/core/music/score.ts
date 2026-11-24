import type { Melody, Note } from './types'

/**
 * A tiny text notation so songs stay readable in code review.
 *
 *   "E4 E4 F4 G4/2 r C5*1.5"
 *
 * - `E4`      a note name (C, C#, D… B) plus octave, lasting one beat
 * - `/2`      divide the length (an eighth note when a beat is a quarter)
 * - `*1.5`    multiply the length (dotted, half notes…)
 * - `r`       a rest, with the same length modifiers
 */
const PITCH_CLASS: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
}

const TOKEN = /^(r|[A-G]#?)(-?\d)?(?:([*/])(\d+(?:\.\d+)?))?$/

/** Parses one note name like "F#4" into a MIDI number. */
export function parseNoteName(name: string): number {
  const match = /^([A-G]#?)(-?\d)$/.exec(name)
  const pc = match && PITCH_CLASS[match[1] ?? '']
  if (!match || pc === undefined || pc === null) throw new Error(`Bad note name: ${name}`)
  return (Number(match[2]) + 1) * 12 + pc
}

/**
 * Turns notation into timed notes.
 * @param bpm beats per minute; one plain token lasts one beat.
 */
export function parseScore(title: string, notation: string, bpm: number): Melody {
  const secondsPerBeat = 60 / bpm
  const notes: Note[] = []
  let beat = 0

  for (const token of notation.trim().split(/\s+/)) {
    const match = TOKEN.exec(token)
    if (!match) throw new Error(`Bad token "${token}" in ${title}`)
    const [, pitch = 'r', octave, op, amount] = match
    const factor = Number(amount ?? 1)
    const beats = op === '/' ? 1 / factor : op === '*' ? factor : 1

    if (pitch !== 'r') {
      notes.push({
        midi: parseNoteName(`${pitch}${octave ?? 4}`),
        time: beat * secondsPerBeat,
        // Slightly shorter than the slot so repeated notes are re-struck audibly.
        duration: beats * secondsPerBeat * 0.92,
        velocity: 0.8,
      })
    }
    beat += beats
  }
  return { title, notes }
}
