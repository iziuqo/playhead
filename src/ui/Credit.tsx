/**
 * Credit — the tiny "made by" signature in the footer.
 *
 * Micro-interaction: on hover/focus each letter of the name rises in turn,
 * like keys being struck left to right, and takes the colour of its note
 * (the same pitch palette the keyboard uses). A soft three-note arpeggio
 * plays once per hover so the signature "sounds" like the instrument.
 * All motion is pure CSS (see `.credit` in styles.css) and honours
 * prefers-reduced-motion.
 */
import type { CSSProperties } from 'react'
import { pitchColor } from '../core'

const AUTHOR = 'Izaias Cavalcanti'
const PORTFOLIO = 'https://portfolio.izaias.xyz'
/** Letters walk up a C major scale so colours glide around the wheel. */
const SCALE = [0, 2, 4, 5, 7, 9, 11]

interface CreditProps {
  /** Called once when the pointer or focus arrives; used to play a chime. */
  onGreet?: () => void
}

export function Credit({ onGreet }: CreditProps) {
  return (
    <a
      className="credit"
      href={PORTFOLIO}
      target="_blank"
      rel="noopener noreferrer"
      onPointerEnter={onGreet}
      onFocus={onGreet}
      aria-label={`Made by ${AUTHOR}, opens portfolio in a new tab`}
    >
      <span className="credit__by" aria-hidden="true">made by</span>
      <span className="credit__name" aria-hidden="true">
        {[...AUTHOR].map((char, i) => (
          <span
            key={i}
            className="credit__char"
            style={{ '--i': i, '--note': pitchColor(60 + SCALE[i % SCALE.length]!) } as CSSProperties}
          >
            {char === ' ' ? ' ' : char}
          </span>
        ))}
      </span>
      <span className="credit__arrow" aria-hidden="true">↗</span>
    </a>
  )
}
