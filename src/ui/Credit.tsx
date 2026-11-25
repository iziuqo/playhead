/**
 * Credit — the author, as a chat head in the top-right corner.
 *
 * The flow, beat by beat:
 *
 * 1. Wait. Nothing shows until the visitor has been playing for a few
 *    seconds (counted from their first note).
 * 2. Knock. A small round photo pops in with a "1" badge, like a message
 *    you haven't opened. Every few seconds it gives a tiny nudge, nothing more.
 * 3. Talk. Only when it's clicked does the chat begin: "typing…" dots, then
 *    a message, then dots again, paced by each message's length the way a
 *    person types. Each arriving message plays one soft note. If the
 *    visitor has played a lot, the greeting notices.
 * 4. Ask. Once the last message lands, and not before, the "Hire me" button
 *    rises in. It is the only link (the contact page, in a new tab).
 * 5. Rest. The chat head (now a ×), Escape or a click outside folds it
 *    away. A closed chat keeps its place: reopening resumes where it
 *    stopped, and a finished chat reopens instantly, already read.
 *
 * Accessibility: the chat head is a disclosure button (aria-expanded); the
 * panel is a labelled dialog that is inert while closed, and new messages
 * are announced politely. Motion lives in styles.css (`.chat…`) and honours
 * prefers-reduced-motion: the whole chat then appears at once.
 */
import { useEffect, useRef, useState } from 'react'
import { AVATAR_URL } from './avatar'
import type { Piano } from './usePiano'

// ---------- Content ----------
const AUTHOR = 'Izaias Cavalcanti'
const STATUS = 'Product designer · online'
const CONTACT_URL = 'https://portfolio.izaias.xyz/contact'
const CTA = 'Hire me'
/** Played at least this many notes? The greeting compliments it. */
const KEEN_PLAYER_NOTES = 24

/** The script, written when the chat opens so it can react to the visitor. */
const script = (notesPlayed: number) => [
  notesPlayed >= KEEN_PLAYER_NOTES ? 'Hey, nice playing 🎹' : 'Hey 👋',
  'I’m Izaias. I designed and built Playhead, every pixel and every note.',
  'If you want something this fun in your product, I’d love to help.',
]

// ---------- Timing (ms) ----------
/** How long the visitor plays before the chat head appears. */
const PLAY_BEFORE_KNOCK = 5000
/** "Typing" time for a message: a base, plus a little per character, capped. */
const typingTime = (text: string) => Math.min(1700, 550 + text.length * 16)
/** A breath between one message landing and the next "typing…". */
const BETWEEN_MESSAGES = 350
/** One soft rising note per message: a C major triad, an octave up. */
const MESSAGE_NOTES = [84, 88, 91]

interface CreditProps {
  /** The piano's note stream: the chat head waits for the visitor to play. */
  subscribe: Piano['subscribe']
  /** Plays one soft note; called as each message arrives. */
  onNote?: (midi: number) => void
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Credit({ subscribe, onNote }: CreditProps) {
  const [shown, setShown] = useState(false) // the chat head has arrived
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<string[]>([]) // written on first open
  const [delivered, setDelivered] = useState(0) // messages already on screen
  const [typing, setTyping] = useState(false)
  const notesPlayed = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLButtonElement>(null)

  const started = messages.length > 0
  const done = started && delivered === messages.length

  // 1. Count notes; knock a few seconds after the first one.
  useEffect(() => {
    let timer = 0
    return subscribe(({ type }) => {
      if (type !== 'on') return
      notesPlayed.current += 1
      if (!timer) timer = window.setTimeout(() => setShown(true), PLAY_BEFORE_KNOCK)
    })
  }, [subscribe])

  // 3. While open, deliver the next message after its "typing" time.
  useEffect(() => {
    if (!open || !started || done) return setTyping(false)
    if (prefersReducedMotion()) return setDelivered(messages.length)
    const text = messages[delivered]!
    let timer = window.setTimeout(() => {
      setTyping(true)
      timer = window.setTimeout(() => {
        setTyping(false)
        setDelivered((n) => n + 1)
        onNote?.(MESSAGE_NOTES[delivered % MESSAGE_NOTES.length]!)
      }, typingTime(text))
    }, delivered === 0 ? 450 : BETWEEN_MESSAGES)
    return () => window.clearTimeout(timer)
  }, [open, started, done, delivered, messages]) // eslint-disable-line react-hooks/exhaustive-deps

  // 5. While open: Escape or a press outside closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      head.current?.focus()
    }
    const onPress = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPress, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPress, true)
    }
  }, [open])

  // A closed panel must not be reachable by Tab or screen readers.
  useEffect(() => {
    panel.current?.toggleAttribute('inert', !open)
  }, [open])

  const toggle = () => {
    if (!started) setMessages(script(notesPlayed.current))
    setOpen((o) => !o)
  }

  return (
    <div
      ref={root}
      className="chat"
      data-shown={shown || undefined}
      data-open={open || undefined}
      data-unread={!started || undefined}
      aria-hidden={!shown || undefined}
    >
      <button
        ref={head}
        type="button"
        className="chat__head"
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? 'Close the chat' : started ? `Chat with ${AUTHOR}` : `1 new message from ${AUTHOR}`}
        tabIndex={shown ? 0 : -1}
        onClick={toggle}
      >
        <img className="chat__photo" src={AVATAR_URL} alt="" width={48} height={48} />
        <svg className="chat__x" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </svg>
        <span className="chat__badge" aria-hidden="true">1</span>
      </button>

      <div ref={panel} id="chat-panel" className="chat__panel" role="dialog" aria-label={`Chat with ${AUTHOR}`}>
        <header className="chat__top">
          <img className="chat__photo chat__photo--small" src={AVATAR_URL} alt="" width={32} height={32} />
          <span className="chat__who">
            <strong>{AUTHOR}</strong>
            <span className="chat__status">{STATUS}</span>
          </span>
        </header>

        <div className="chat__thread" aria-live="polite">
          {messages.slice(0, delivered).map((text) => (
            <p key={text} className="chat__bubble">{text}</p>
          ))}
          {typing && (
            <p className="chat__bubble chat__bubble--typing" aria-label={`${AUTHOR} is typing`}>
              <i /><i /><i />
            </p>
          )}
        </div>

        {done && (
          <a className="chat__cta" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
            {CTA}
            <svg className="chat__arrow" width="11" height="11" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 7.5 7.5 2.5M3.5 2.5h4v4" />
            </svg>
            <span className="sr-only"> (opens the contact page in a new tab)</span>
          </a>
        )}
      </div>
    </div>
  )
}
