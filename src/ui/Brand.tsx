/**
 * Brand — the Playhead logo: a tiny piano with a timeline playhead on it,
 * plus a two-weight wordmark ("Play" bold, "head" light).
 *
 * The mark is alive:
 * - Hover: the playhead scrubs across the keys and back.
 * - While you play: the playhead glides to where the note sits on the
 *   keyboard and its head flashes that note's colour, then drifts home.
 * Updates go straight to CSS variables on the SVG (no React re-render per
 * note), so it costs nothing while you play.
 */
import { useEffect, useRef } from 'react'
import { pitchColor } from '../core'
import type { Piano } from './usePiano'

interface BrandProps {
  subscribe: Piano['subscribe']
  /** Lowest and highest MIDI notes on screen, to place the playhead. */
  range: readonly [number, number]
}

/** How far (in SVG units) the playhead may travel either side of centre. */
const TRAVEL = 8
/** Idle time before the playhead returns to centre. */
const HOME_AFTER_MS = 1400

export function Brand({ subscribe, range }: BrandProps) {
  const mark = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let home = 0
    const [low, high] = range
    return subscribe(({ type, midi }) => {
      const el = mark.current
      if (!el || type !== 'on') return
      const t = (midi - low) / Math.max(1, high - low) // 0..1 across the keyboard
      el.style.setProperty('--ph-x', `${((t - 0.5) * 2 * TRAVEL).toFixed(2)}px`)
      el.style.setProperty('--ph-color', pitchColor(midi))
      el.classList.remove('logo--hit')
      void el.getBoundingClientRect() // restart the CSS animation
      el.classList.add('logo--hit')
      window.clearTimeout(home)
      home = window.setTimeout(() => {
        el.style.removeProperty('--ph-x')
        el.style.removeProperty('--ph-color')
      }, HOME_AFTER_MS)
    })
  }, [subscribe, range])

  return (
    <div className="brand" role="img" aria-label="Playhead">
      <svg ref={mark} className="logo" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect className="logo__tile" x="0.5" y="0.5" width="31" height="31" rx="9" />
        {/* three white keys, two black keys */}
        <rect className="logo__white" x="6.5" y="9" width="6" height="16" rx="1.6" />
        <rect className="logo__white" x="13" y="9" width="6" height="16" rx="1.6" />
        <rect className="logo__white" x="19.5" y="9" width="6" height="16" rx="1.6" />
        <rect className="logo__black" x="10.6" y="9" width="3.4" height="9.5" rx="1.1" />
        <rect className="logo__black" x="18" y="9" width="3.4" height="9.5" rx="1.1" />
        {/* the playhead: a line with a downward-pointing head */}
        <g className="logo__playhead">
          <rect className="logo__line" x="15.25" y="6" width="1.5" height="21.5" rx="0.75" />
          <path className="logo__head" d="M12.6 4.2h6.8a1 1 0 0 1 1 1v2.4a1 1 0 0 1-.36.77L16.64 10.6a1 1 0 0 1-1.28 0L12.96 8.37a1 1 0 0 1-.36-.77V5.2a1 1 0 0 1 1-1Z" />
        </g>
      </svg>
      <span className="brand__name"><b>Play</b>head</span>
    </div>
  )
}
