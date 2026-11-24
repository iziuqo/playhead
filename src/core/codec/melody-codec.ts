import type { Melody, Note } from '../music/types'

/**
 * Packs a melody into a short, URL-safe string (and back) so share links need
 * no server: everything lives in the link's #hash.
 *
 * Format (all integers as LEB128 varints, then base64url):
 *   [version=1] [title length] [title UTF-8 bytes] [note count]
 *   per note, sorted by time:
 *     [start delta in 10 ms ticks] [midi] [duration in 10 ms ticks] [velocity 0–15]
 *
 * Deltas keep numbers small, so a 30-note melody fits in ~120 characters.
 */
const VERSION = 1
const TICK_SECONDS = 0.01
const VELOCITY_STEPS = 15
const MAX_TITLE_BYTES = 60

export function encodeMelody({ title, notes }: Melody): string {
  const bytes: number[] = []
  const write = (value: number) => {
    let v = Math.max(0, Math.round(value))
    do {
      const low = v & 0x7f
      v >>>= 7
      bytes.push(v ? low | 0x80 : low)
    } while (v)
  }

  const titleBytes = new TextEncoder().encode(title).slice(0, MAX_TITLE_BYTES)
  write(VERSION)
  write(titleBytes.length)
  bytes.push(...titleBytes)

  const sorted = [...notes].sort((a, b) => a.time - b.time)
  write(sorted.length)
  let previousTick = 0
  for (const note of sorted) {
    const tick = Math.round(note.time / TICK_SECONDS)
    write(tick - previousTick)
    write(note.midi)
    write(Math.max(1, note.duration / TICK_SECONDS))
    write(note.velocity * VELOCITY_STEPS)
    previousTick = tick
  }
  return toBase64Url(Uint8Array.from(bytes))
}

/** Inverse of {@link encodeMelody}. Throws on malformed input. */
export function decodeMelody(code: string): Melody {
  const bytes = fromBase64Url(code)
  let offset = 0
  const read = (): number => {
    let result = 0
    let shift = 0
    for (;;) {
      const byte = bytes[offset++]
      if (byte === undefined) throw new Error('Melody code is truncated')
      result += (byte & 0x7f) * 2 ** shift
      if (!(byte & 0x80)) return result
      shift += 7
    }
  }

  if (read() !== VERSION) throw new Error('Unsupported melody code version')
  const titleLength = read()
  const title = new TextDecoder().decode(bytes.slice(offset, offset + titleLength))
  offset += titleLength

  const notes: Note[] = []
  let tick = 0
  for (let count = read(); count > 0; count--) {
    tick += read()
    notes.push({
      time: tick * TICK_SECONDS,
      midi: read(),
      duration: read() * TICK_SECONDS,
      velocity: read() / VELOCITY_STEPS,
    })
  }
  return { title, notes }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}
