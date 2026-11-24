/**
 * Scales used by "Play my canvas" to snap arbitrary heights onto notes that
 * always sound good together.
 */

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
} as const satisfies Record<string, readonly number[]>

export type ScaleName = keyof typeof SCALES

/**
 * Returns the `degree`-th note of a scale starting at `rootMidi`.
 * Degree 0 is the root; degrees beyond the scale length climb octaves,
 * negative degrees go down.
 */
export function scaleNote(rootMidi: number, scale: ScaleName, degree: number): number {
  const steps = SCALES[scale]
  const octave = Math.floor(degree / steps.length)
  const index = degree - octave * steps.length
  return rootMidi + octave * 12 + (steps[index] ?? 0)
}
