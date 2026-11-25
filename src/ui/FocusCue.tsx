/**
 * FocusCue — the keyboard's power light.
 *
 * There is no toast. The keys themselves say whether the computer keyboard
 * reaches the piano (all the styling lives in styles.css, "Keyboard power"):
 *
 * - Off (the page can't hear the keyboard): the keys dim to a powered-down
 *   grey, their letter labels go dark, and a thin amber standby light
 *   breathes along the top edge, like a sleeping device. Any click wakes it.
 * - Turning on (focus arrives): the light flashes across, and a wave of note
 *   colour runs over the keys, left to right, as each one comes back to life.
 * - On: the keys look like normal; nothing else shows.
 *
 * This component renders the light, plus a visually hidden status line so
 * screen readers hear the same thing. The state comes from the parent's
 * `.deck[data-keys]` and `[data-woke]` attributes (see useKeyboardFocus).
 * On touch-only devices, where there is no keyboard, the keys never dim.
 */
interface FocusCueProps {
  focused: boolean
}

export function FocusCue({ focused }: FocusCueProps) {
  return (
    <>
      <span className="power" aria-hidden="true" />
      <p className="sr-only" role="status">
        {focused ? 'Keyboard on' : 'Click the piano to play it with your computer keyboard'}
      </p>
    </>
  )
}
