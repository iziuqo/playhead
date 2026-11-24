/**
 * Pitch helpers: MIDI numbers ⇄ names, black/white keys and pitch colors.
 */

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

/** Semitones (0–11) that are black keys on a piano. */
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

/** The pitch class of a MIDI note: 0 = C, 1 = C♯ … 11 = B. */
export const pitchClass = (midi: number): number => ((midi % 12) + 12) % 12

/** Scientific octave number, where middle C (60) is C4. */
export const octaveOf = (midi: number): number => Math.floor(midi / 12) - 1

/** "C4", "F♯5"… */
export const noteName = (midi: number): string =>
  `${SHARP_NAMES[pitchClass(midi)]}${octaveOf(midi)}`

/** "C", "F♯"… without the octave. */
export const pitchName = (midi: number): string => SHARP_NAMES[pitchClass(midi)] ?? '?'

export const isBlackKey = (midi: number): boolean => BLACK_PITCH_CLASSES.has(pitchClass(midi))

/** Frequency in Hz using A4 = 440 Hz equal temperament. */
export const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12)

/** Every MIDI number in [low, high], inclusive. */
export const midiRange = (low: number, high: number): number[] =>
  Array.from({ length: high - low + 1 }, (_, i) => low + i)

/**
 * One hue per pitch class, walking the color wheel by fifths so neighbouring
 * keys get clearly different colors (Chrome Music Lab style). Lightness and
 * chroma are fixed so every note reads equally bright.
 */
export const pitchColor = (midi: number): string => {
  const stepsAroundCircleOfFifths = (pitchClass(midi) * 7) % 12
  const hue = Math.round(stepsAroundCircleOfFifths * 30 + 20) % 360
  return `oklch(0.78 0.15 ${hue})`
}

/** Same hue as {@link pitchColor}, as plain RGB in 0–1 (for Figma fills). */
export const pitchColorRgb = (midi: number): { r: number; g: number; b: number } =>
  hslToRgb(((pitchClass(midi) * 7) % 12) * 30 + 20, 0.78, 0.66)

function hslToRgb(hueDeg: number, s: number, l: number) {
  const h = (((hueDeg % 360) + 360) % 360) / 360
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return { r: f(0), g: f(8), b: f(4) }
}
