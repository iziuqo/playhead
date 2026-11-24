import { useEffect, useState } from 'react'

/**
 * Tracks whether this page can hear the computer keyboard.
 *
 * Inside Figma (and any iframe) key presses only reach the piano once the
 * frame has focus. This hook:
 *   1. tries to take focus by itself on load and whenever the pointer moves
 *      over the page (browsers may allow it; if not, a click always works);
 *   2. reports `focused` so the UI can show a gentle cue when it doesn't;
 *   3. reports `woke` for one short moment after focus arrives, so the UI can
 *      celebrate it (a light sweep and a chime).
 */
export function useKeyboardFocus(wakeMs = 1600): { focused: boolean; woke: boolean } {
  const [focused, setFocused] = useState(() => document.hasFocus())
  const [woke, setWoke] = useState(false)

  useEffect(() => {
    let timer = 0
    const grab = () => {
      if (!document.hasFocus()) window.focus()
    }
    const onFocus = () => {
      setFocused(true)
      setWoke(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setWoke(false), wakeMs)
    }
    const onBlur = () => setFocused(false)

    grab()
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    document.addEventListener('pointermove', grab, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('pointermove', grab)
    }
  }, [wakeMs])

  return { focused, woke }
}
