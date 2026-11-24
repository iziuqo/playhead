/**
 * Computer keyboard → piano, using the layout musicians know from GarageBand
 * and Ableton: the home row is the white keys, the row above is the black keys.
 *
 *    W E   T Y U   O P
 *   A S D F G H J K L ; '
 *   C D E F G A B C D E F
 *
 * Values are semitones above the current base octave's C. We key by
 * `KeyboardEvent.code` (physical position) so AZERTY/QWERTZ users get the same
 * shape under their fingers.
 */
export const KEY_TO_SEMITONE: Readonly<Record<string, number>> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7,
  KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14,
  KeyP: 15, Semicolon: 16, Quote: 17,
}

/** Reverse map for drawing key hints on the piano ("A" on C, "W" on C♯…). */
export const SEMITONE_TO_LABEL: ReadonlyMap<number, string> = new Map(
  Object.entries(KEY_TO_SEMITONE).map(([code, semitone]) => [
    semitone,
    code === 'Semicolon' ? ';' : code === 'Quote' ? "'" : code.replace('Key', ''),
  ]),
)

export const OCTAVE_DOWN_CODE = 'KeyZ'
export const OCTAVE_UP_CODE = 'KeyX'
export const SUSTAIN_CODE = 'Space'
