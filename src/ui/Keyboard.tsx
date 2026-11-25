import { useRef } from 'react'
import { SEMITONE_TO_LABEL, noteName, pitchColor } from '../core'
import type { KeyGeometry } from './layout'

interface Props {
  keys: readonly KeyGeometry[]
  pressed: ReadonlySet<number>
  /** Keys to softly highlight: the next notes to play in practice. */
  guide?: ReadonlySet<number>
  /** The C that the computer keyboard's "A" plays. */
  baseOctaveC: number
  onPress: (midi: number, velocity: number) => void
  onRelease: (midi: number) => void
}

/**
 * The on-screen piano. Real <button>s for accessibility; pointer handling sits
 * on the container so a drag glides across keys (glissando) and multi-touch
 * plays chords. Velocity comes from how far down the key you strike.
 */
export function Keyboard({ keys, pressed, guide, baseOctaveC, onPress, onRelease }: Props) {
  /** Which key each active pointer (mouse, finger) is holding. */
  const pointers = useRef(new Map<number, number>())

  const keyAt = (x: number, y: number): { midi: number; velocity: number } | undefined => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-midi]')
    if (!el) return undefined
    const rect = el.getBoundingClientRect()
    const depth = Math.min(1, Math.max(0, (y - rect.top) / rect.height))
    return { midi: Number(el.dataset.midi), velocity: 0.45 + 0.5 * depth }
  }

  const move = (e: React.PointerEvent, isDown: boolean) => {
    if (!isDown && !pointers.current.has(e.pointerId)) return
    const hit = keyAt(e.clientX, e.clientY)
    const current = pointers.current.get(e.pointerId)
    if (hit?.midi === current) return
    if (current !== undefined) onRelease(current)
    if (hit) {
      onPress(hit.midi, hit.velocity)
      pointers.current.set(e.pointerId, hit.midi)
    } else pointers.current.delete(e.pointerId)
  }

  const up = (e: React.PointerEvent) => {
    const current = pointers.current.get(e.pointerId)
    if (current !== undefined) onRelease(current)
    pointers.current.delete(e.pointerId)
  }

  return (
    <div
      className="keyboard"
      role="group"
      aria-label="Piano keyboard. Play with A to K for white keys, W E T Y U for black keys, Z and X to change octave, Space to sustain."
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        e.preventDefault()
        move(e, true)
      }}
      onPointerMove={(e) => move(e, false)}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {keys.map(({ midi, black, x, width }) => {
        const hint = SEMITONE_TO_LABEL.get(midi - baseOctaveC)
        const isC = midi % 12 === 0
        return (
          <button
            key={midi}
            type="button"
            tabIndex={-1}
            data-midi={midi}
            aria-label={noteName(midi)}
            aria-pressed={pressed.has(midi)}
            className={`key ${black ? 'key--black' : 'key--white'}${guide?.has(midi) ? ' key--guide' : ''}`}
            style={{ left: `${x * 100}%`, width: `${width * 100}%`, ['--note' as string]: pitchColor(midi), ['--x' as string]: x }}
            onKeyDown={(e) => e.key === 'Enter' && onPress(midi, 0.8)}
            onKeyUp={(e) => e.key === 'Enter' && onRelease(midi)}
          >
            {hint && <kbd className="key__hint">{hint}</kbd>}
            {isC && !black && <span className="key__octave">{noteName(midi)}</span>}
          </button>
        )
      })}
    </div>
  )
}
