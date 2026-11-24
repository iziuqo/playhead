import { isBlackKey, midiRange } from '../core'

/**
 * Piano key geometry in fractions of the keyboard width (0–1). The keyboard
 * and the note stage both use it, so falling notes always line up with keys.
 */
export interface KeyGeometry {
  midi: number
  black: boolean
  /** Left edge, 0–1. */
  x: number
  /** Width, 0–1. */
  width: number
}

/** Black keys are 60% as wide as white keys and centered on the gap. */
const BLACK_RATIO = 0.6

export function keyLayout(low: number, high: number): KeyGeometry[] {
  const midis = midiRange(low, high)
  const whiteCount = midis.filter((m) => !isBlackKey(m)).length
  const white = 1 / whiteCount
  let whiteIndex = 0
  return midis.map((midi) => {
    if (isBlackKey(midi)) {
      const width = white * BLACK_RATIO
      return { midi, black: true, x: whiteIndex * white - width / 2, width }
    }
    return { midi, black: false, x: whiteIndex++ * white, width: white }
  })
}

/** Visible range for a container width: three octaves on desktop, two on small screens. */
export const rangeForWidth = (width: number): [number, number] =>
  width >= 820 ? [48, 84] : [60, 84]
