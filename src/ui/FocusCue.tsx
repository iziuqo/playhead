/**
 * FocusCue — a small pill that floats on the keyboard's top edge.
 *
 * - Page not focused: "Click to play with your keyboard", softly breathing.
 *   It never blocks anything: it ignores the pointer, so the click that
 *   dismisses it lands on whatever is under it (usually a key, which plays).
 * - Focus arrives: it flips to "Keyboard on" with a check, then fades away.
 * - Focused and settled: hidden.
 * Hidden on touch-only devices, where there is no keyboard to focus.
 */
interface FocusCueProps {
  focused: boolean
  woke: boolean
}

export function FocusCue({ focused, woke }: FocusCueProps) {
  const state = !focused ? 'asleep' : woke ? 'awake' : 'hidden'
  return (
    <div className="focus-cue" data-state={state} role="status" aria-live="polite">
      <span className="focus-cue__icon" aria-hidden="true">{focused ? '✓' : '⌨'}</span>
      {focused ? 'Keyboard on — play away' : 'Click to play with your keyboard'}
    </div>
  )
}
