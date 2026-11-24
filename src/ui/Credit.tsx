/**
 * Credit — the tiny "made by … · hire me" signature in the footer.
 *
 * It behaves like a one-line chat with the author:
 * - At rest: "made by Izaias Cavalcanti" and a small "Hire me" chip with a
 *   live green dot. After a while an unread "1" pops on the chip, once.
 * - Hover/focus: the name's letters hop like struck keys, and a chat bubble
 *   rises above it: typing dots first, then the message types itself out,
 *   each word playing the next note of a pentatonic run, so the message
 *   "sounds" like the instrument. It replays on every visit.
 * - Click: opens the contact page in a new tab.
 *
 * The bubble ignores the pointer and sits above the footer, so it never
 * covers anything you are using. Motion lives in styles.css (`.credit`,
 * `.chat`, `.hire`) and honours prefers-reduced-motion (the message then
 * appears whole and silent).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { pitchColor } from '../core'

const AUTHOR = 'Izaias Cavalcanti'
const CONTACT = 'https://portfolio.izaias.xyz/contact'
const MESSAGE = "Hey 👋 I design and build things like this. Want one? Let's talk →"
/** Split by code point so the emoji never shows half-typed. */
const CHARS = [...MESSAGE]
/** Letters walk up a C major scale so colours glide around the wheel. */
const SCALE = [0, 2, 4, 5, 7, 9, 11]
/** Notes for the message's words: a rising major pentatonic. */
const WORD_NOTES = [76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103]
const TYPING_DOTS_MS = 520
const CHAR_MS = 22
/** The "1 unread" badge appears once, after this long on the page. */
const UNREAD_AFTER_MS = 9000

interface CreditProps {
  /** Plays one soft note; called as each word of the message appears. */
  onNote?: (midi: number) => void
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Credit({ onNote }: CreditProps) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(0) // characters of the message revealed
  const [unread, setUnread] = useState(false)
  const read = useRef(false)

  // One gentle nudge per visit, unless they already looked.
  useEffect(() => {
    const t = window.setTimeout(() => !read.current && setUnread(true), UNREAD_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [])

  // Type the message out while the bubble is open.
  useEffect(() => {
    if (!open) return setShown(0)
    if (prefersReducedMotion()) return setShown(CHARS.length)
    let i = 0
    let word = 0
    let timer = window.setTimeout(function tick() {
      // A word starts at index 0 or after a space: give it a note.
      if (i === 0 || CHARS[i - 1] === ' ') onNote?.(WORD_NOTES[word++ % WORD_NOTES.length]!)
      setShown(++i)
      if (i < CHARS.length) timer = window.setTimeout(tick, CHAR_MS)
    }, TYPING_DOTS_MS)
    return () => window.clearTimeout(timer)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = () => {
    read.current = true
    setUnread(false)
    setOpen(true)
  }
  const hide = () => setOpen(false)
  const typing = open && shown === 0

  return (
    <a
      className="credit"
      href={CONTACT}
      target="_blank"
      rel="noopener noreferrer"
      data-open={open || undefined}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-label={`Made by ${AUTHOR}. Available for hire: opens the contact page in a new tab`}
    >
      <span className="chat" aria-hidden="true">
        <span className="chat__avatar">IC</span>
        <span className="chat__bubble">
          {typing ? (
            <span className="chat__dots"><i /><i /><i /></span>
          ) : (
            <>
              {CHARS.slice(0, shown).join('')}
              {shown < CHARS.length && <span className="chat__caret" />}
            </>
          )}
        </span>
      </span>

      <span className="credit__by" aria-hidden="true">made by</span>
      <span className="credit__name" aria-hidden="true">
        {[...AUTHOR].map((char, i) => (
          <span
            key={i}
            className="credit__char"
            style={{ '--i': i, '--note': pitchColor(60 + SCALE[i % SCALE.length]!) } as CSSProperties}
          >
            {char === ' ' ? '\u00a0' : char}
          </span>
        ))}
      </span>
      <span className="hire" aria-hidden="true">
        <span className="hire__dot" />
        Hire me
        {unread && <span className="hire__badge">1</span>}
      </span>
    </a>
  )
}
