import { useEffect, useRef, useState } from 'react'

/** How often we double-check focus, in case the browser skipped an event. */
const RECHECK_MS = 400
/** Focus must have been gone this long for its return to be celebrated (ignores flicker). */
const MIN_ASLEEP_MS = 600

/**
 * Tracks whether this page can hear the computer keyboard.
 *
 * Inside Figma (and any iframe) key presses only reach the piano once the
 * frame has focus. This hook:
 *   1. tries to take focus by itself on load and whenever the pointer moves
 *      over the page (browsers may allow it; if not, a click always works);
 *   2. reports `focused` so the UI can show a gentle cue when it doesn't;
 *   3. reports `woke` for one short moment when focus *arrives* (never on a
 *      page that loads already focused, never for a split-second flicker),
 *      so the UI can celebrate it. The moment ends early as soon as the
 *      visitor plays or clicks: they already know it works.
 *
 * Why it is accurate: `document.hasFocus()` is the single source of truth.
 * Every signal (focus/blur, focusin/focusout, visibility, a key press, a
 * click) just triggers a re-read of it, and a light timer re-reads it too.
 * Browsers don't always fire focus events inside iframes (for example when
 * focus is given programmatically during load), so we never rely on an event
 * alone. A received key press is proof of focus, so it always counts.
 */
export function useKeyboardFocus(wakeMs = 2000): { focused: boolean; woke: boolean } {
  const [focused, setFocused] = useState(() => document.hasFocus())
  const [woke, setWoke] = useState(false)
  const current = useRef(focused)

  useEffect(() => {
    let wakeTimer = 0
    let asleepSince = performance.now() // a grab right after load is not "returning"

    const settle = () => {
      window.clearTimeout(wakeTimer)
      setWoke(false)
    }
    const apply = (next: boolean) => {
      if (next === current.current) return
      current.current = next
      setFocused(next)
      settle()
      if (!next) {
        asleepSince = performance.now()
      } else if (performance.now() - asleepSince >= MIN_ASLEEP_MS) {
        setWoke(true)
        wakeTimer = window.setTimeout(settle, wakeMs)
      }
    }
    const sync = () => apply(document.hasFocus())
    // Blur fires before focus has fully left, so re-read on the next frame.
    const syncSoon = () => requestAnimationFrame(sync)
    // A key press proves focus; it also means the celebration can end.
    const proven = () => {
      apply(true)
      settle()
    }
    const pressed = () => {
      settle()
      syncSoon()
    }
    const grab = () => {
      if (!document.hasFocus()) {
        window.focus()
        sync()
      }
    }

    // Listen first, then try to grab focus, so no transition is missed.
    window.addEventListener('focus', sync)
    window.addEventListener('blur', syncSoon)
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', syncSoon)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('keydown', proven, { capture: true })
    window.addEventListener('pointerdown', pressed, { capture: true })
    document.addEventListener('pointermove', grab, { passive: true })
    grab()
    sync()
    const recheck = window.setInterval(() => {
      if (document.visibilityState === 'visible') sync()
    }, RECHECK_MS)

    return () => {
      window.clearTimeout(wakeTimer)
      window.clearInterval(recheck)
      window.removeEventListener('focus', sync)
      window.removeEventListener('blur', syncSoon)
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', syncSoon)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('keydown', proven, { capture: true })
      window.removeEventListener('pointerdown', pressed, { capture: true })
      document.removeEventListener('pointermove', grab)
    }
  }, [wakeMs])

  return { focused, woke }
}
