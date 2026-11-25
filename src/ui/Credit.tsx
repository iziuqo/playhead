/**
 * Credit — the author's note, shaped like a chat notification.
 *
 * It stays out of the way until it has earned a look:
 *
 * 1. Wait: nothing shows until the visitor has been playing for a few
 *    seconds (counted from their first note).
 * 2. Notify: a small notification glides into the top-right corner:
 *    avatar, "Izaias · now" and one preview line. A soft dot breathes
 *    beside it like an unread message. Nothing else moves.
 * 3. Chat: clicking it opens the conversation in place. The messages type
 *    themselves out, one note per word, then a green reply bubble,
 *    "Hire me ↗", links to the contact page. It is the only link.
 * 4. Close: the × (or Escape, or a click outside) folds the chat back into
 *    the notification. It stays there, quiet, until the visitor wants it.
 *
 * Accessibility: the notification is a real disclosure button
 * (aria-expanded); the chat is a labelled region whose controls are
 * unreachable while folded (inert). Motion lives in styles.css (`.note…`)
 * and honours prefers-reduced-motion: the chat then appears whole.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { pitchColor } from '../core'
import type { Piano } from './usePiano'

// ---------- Content ----------
const AUTHOR = 'Izaias Cavalcanti'
const FIRST_NAME = 'Izaias'
const ROLE = 'Product designer who codes'
const CONTACT_URL = 'https://portfolio.izaias.xyz/contact'
/** The preview line before and after the chat has been read. */
const PREVIEW = { unread: 'Enjoying it? I made this 🎹', read: 'Open to work · let’s talk' }
/** The chat, one bubble each. */
const MESSAGES = ['Hey 👋 I designed and built this piano, from pixels to pitch.', 'Want something this fun for your product? Let’s make it.']
const CTA = 'Hire me'

// ---------- Typing ----------
/** Each message split by code point (so emoji never show half typed), plus where it starts in the whole chat. */
const BUBBLES = MESSAGES.map((text, i) => ({
  chars: [...text],
  start: MESSAGES.slice(0, i).reduce((sum, m) => sum + [...m].length, 0),
}))
const TOTAL = BUBBLES.reduce((sum, b) => sum + b.chars.length, 0)
const CHARS = BUBBLES.flatMap((b) => b.chars)
const isBubbleStart = (i: number) => BUBBLES.some((b) => b.start === i)
/** A soft rising major pentatonic: one note per word as the chat types. */
const WORD_NOTES = [76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103]
/** Sparks that burst from the reply bubble when it is pressed. */
const SPARKS = 12
const SPARK_STYLES = Array.from({ length: SPARKS }, (_, i) =>
  ({ '--a': `${(360 / SPARKS) * i}deg`, '--note': pitchColor(60 + i * 7) }) as CSSProperties,
)

// ---------- Timing (ms) ----------
/** How long the visitor plays before the notification appears. */
const PLAY_BEFORE_NOTIFY = 5000
/** Typing dots before each bubble, and the pace of the characters. */
const TYPING_DOTS = 600
const CHAR_EVERY = 22

interface CreditProps {
  /** The piano's note stream: the notification waits for the visitor to play. */
  subscribe: Piano['subscribe']
  /** Plays one soft note; called per word as the chat types. */
  onNote?: (midi: number) => void
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Credit({ subscribe, onNote }: CreditProps) {
  const [shown, setShown] = useState(false) // notification has arrived
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState(false)
  const [typed, setTyped] = useState(0) // characters of the chat revealed
  const [burst, setBurst] = useState({ n: 0, x: 0, y: 0 }) // n bumps to replay the burst at x, y
  const root = useRef<HTMLDivElement>(null)
  const chat = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  // 1. Arrive a few seconds after the first note the visitor plays.
  useEffect(() => {
    if (shown) return
    let timer = 0
    const stop = subscribe(({ type }) => {
      if (type === 'on' && !timer) timer = window.setTimeout(() => setShown(true), PLAY_BEFORE_NOTIFY)
    })
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }, [subscribe, shown])

  // 3. Type the chat, one note per word, with typing dots before each bubble.
  useEffect(() => {
    if (!open) return setTyped(0)
    if (prefersReducedMotion()) return setTyped(TOTAL)
    let i = 0
    let word = 0
    let t = window.setTimeout(function tick() {
      if (isBubbleStart(i) || CHARS[i - 1] === ' ') onNote?.(WORD_NOTES[word++ % WORD_NOTES.length]!)
      setTyped(++i)
      if (i < TOTAL) t = window.setTimeout(tick, isBubbleStart(i) ? TYPING_DOTS : CHAR_EVERY)
    }, TYPING_DOTS)
    return () => window.clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // 4. While open: Escape or a press outside folds it back.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    const onPress = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPress, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPress, true)
    }
  }, [open])

  // A folded chat must not be reachable by Tab or screen readers.
  useEffect(() => {
    chat.current?.toggleAttribute('inert', !open)
  }, [open])

  const toggle = () => {
    setRead(true)
    setOpen((o) => !o)
  }

  return (
    <div
      ref={root}
      className="note"
      data-shown={shown || undefined}
      data-open={open || undefined}
      data-unread={!read || undefined}
      data-typing={(open && typed < TOTAL) || undefined}
      aria-hidden={!shown || undefined}
    >
      <button
        ref={trigger}
        type="button"
        className="note__head"
        aria-expanded={open}
        aria-controls="note-chat"
        aria-label={open ? 'Close the chat' : `New message from ${AUTHOR}. Open the chat`}
        tabIndex={shown ? 0 : -1}
        onClick={toggle}
      >
        <span className="note__avatar" aria-hidden="true">IC</span>
        <span className="note__text" aria-hidden="true">
          <span className="note__from">
            {open ? AUTHOR : FIRST_NAME}
            <span className="note__time">now</span>
          </span>
          <span key={String(open)} className="note__sub">{open ? ROLE : read ? PREVIEW.read : PREVIEW.unread}</span>
        </span>
        <span className="note__icon" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path className="note__close" d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </span>
      </button>

      <div ref={chat} id="note-chat" className="note__body" role="region" aria-label={`Chat with ${AUTHOR}`}>
        <div className="note__inner">
          <p className="note__thread" aria-label={MESSAGES.join(' ')}>
            {BUBBLES.map(({ chars, start }) => {
              const shownChars = Math.max(0, Math.min(chars.length, typed - start))
              const waiting = open && typed === start // typing dots before this bubble
              if (!shownChars && !waiting) return null
              return (
                <span key={start} className="note__bubble" aria-hidden="true">
                  {waiting ? (
                    <span className="note__dots"><i /><i /><i /></span>
                  ) : (
                    chars.slice(0, shownChars).join('')
                  )}
                </span>
              )
            })}
          </p>
          <a
            className="note__reply"
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => {
              const box = e.currentTarget.getBoundingClientRect()
              setBurst((b) => ({ n: b.n + 1, x: e.clientX - box.left, y: e.clientY - box.top }))
            }}
          >
            {CTA}
            <svg className="note__arrow" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 7.5 7.5 2.5M3.5 2.5h4v4" />
            </svg>
            <span className="sr-only"> (opens the contact page in a new tab)</span>
            {burst.n > 0 && (
              <span key={burst.n} className="note__sparks" style={{ left: burst.x, top: burst.y }} aria-hidden="true">
                {SPARK_STYLES.map((style, i) => <i key={i} style={style} />)}
              </span>
            )}
          </a>
        </div>
      </div>
    </div>
  )
}
