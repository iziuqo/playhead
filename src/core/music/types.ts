/**
 * The one musical data shape used everywhere in Playhead.
 *
 * Times are in **seconds** from the start of a take or song, so the same notes
 * can be recorded, drawn on the canvas, encoded into a URL and played back
 * without any conversion step.
 */
export interface Note {
  /** MIDI note number (60 = middle C). */
  midi: number
  /** Start time in seconds. */
  time: number
  /** Length in seconds. */
  duration: number
  /** Loudness from 0 (silent) to 1 (full). */
  velocity: number
}

/** A named, ordered list of notes (a recording, a practice song, a daily tune). */
export interface Melody {
  title: string
  notes: Note[]
}
