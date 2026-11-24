/**
 * Credit — the author's signature, shaped like an incoming chat message.
 *
 * The whole thing is ONE link to the contact page: click or tap it anywhere
 * and you are there. Everything else is just there to make you want to.
 *
 * It sits at the top centre (Figma's own toast owns the bottom corner) and
 * tells a tiny story:
 *
 * 1. Arrive: a moment after load a message notification drops in from the
 *    top: avatar, "Izaias · now", and a teasing preview line that changes
 *    every few seconds ("psst… 👋", "are you hiring? 👀"). A ring of note
 *    colours turns around its rim and the avatar nudges now and then, like
 *    an unread message. A green "Hire me ↗" chip makes the action obvious.
 * 2. Reveal (mouse hover or keyboard focus): it morphs into the open chat.
 *    The name turns playable (sweep across the letters to hear them), the
 *    messages type themselves out one by one with a note per word, and the
 *    chip becomes a green reply bubble: "Hire me ↗". Touch skips this: a tap
 *    simply opens the link.
 * 3. Settle: once seen, the ring calms down and the preview just says the
 *    author is open to work, so it stays useful without asking for attention.
 *
 * Pressing it bursts a ring of note-coloured sparks from the finger or
 * cursor. Escape folds the chat back. All motion lives in styles.css
 * (`.island…`) and honours prefers-reduced-motion: messages appear whole.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { pitchColor } from '../core'

// ---------- Content ----------
const AUTHOR = 'Izaias Cavalcanti'
const ROLE = 'Product designer who codes'
const CONTACT_URL = 'https://portfolio.izaias.xyz/contact'
const FIRST_NAME = 'Izaias'
/** The chat, one bubble each. */
const MESSAGES = ['Hey 👋 I designed and built this piano, from pixels to pitch.', 'Want something this fun? Let’s make it.']
/** The preview line until the chat has been opened, one after another. */
const TEASERS = ['psst… 👋', 'I made this piano 🎹', 'are you hiring? 👀'] as const
/** The preview line once the chat has been opened. */
const SETTLED = 'Open to work · let’s talk'
const CTA = 'Hire me'

// ---------- Music ----------
/** Each message split by code point (so emoji never show half typed), plus where it starts in the whole chat. */
const BUBBLES = MESSAGES.map((text, i) => ({
  chars: [...text],
  start: MESSAGES.slice(0, i).reduce((sum, m) => sum + [...m].length, 0),
}))
const TOTAL = BUBBLES.reduce((sum, b) => sum + b.chars.length, 0)
/** Every character in order, to know where words begin. */
const CHARS = BUBBLES.flatMap((b) => b.chars)
const isBubbleStart = (i: number) => BUBBLES.some((b) => b.start === i)
/** A rising major pentatonic: one note per word of the message. */
const WORD_NOTES = [76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103]
/** The name's letters climb a C major scale, so they sound and look like keys. */
const SCALE = [0, 2, 4, 5, 7, 9, 11]
const letterMidi = (i: number) => 72 + SCALE[i % SCALE.length]! + 12 * Math.floor(i / SCALE.length)
/** Sparks that burst out when the island is pressed. */
const SPARKS = 12
const SPARK_STYLES = Array.from({ length: SPARKS }, (_, i) =>
  ({ '--a': `${(360 / SPARKS) * i}deg`, '--note': pitchColor(60 + i * 7) }) as CSSProperties,
)

// ---------- Timing (ms) ----------
const ARRIVE_AFTER = 1800
const TEASE_EVERY = 3000
const HOVER_INTENT = 80
const LEAVE_GRACE = 280
/** How long the typing dots show before each bubble. */
const TYPING_DOTS = 520
const CHAR_EVERY = 18

type Phase = 'hidden' | 'closed' | 'open'

interface CreditProps {
  /** Plays one soft note. Called per word as the message types, and per letter of the name. */
  onNote?: (midi: number) => void
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Credit({ onNote }: CreditProps) {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [seen, setSeen] = useState(false)
  const [teaser, setTeaser] = useState(0)
  const [shown, setShown] = useState(0) // characters of the message revealed
  const [burst, setBurst] = useState({ n: 0, x: 0, y: 0 }) // n bumps to replay the burst at x, y
  const timer = useRef<number>()
  const open = phase === 'open'

  /** Opens or closes after `ms`, replacing any pending hover change. */
  const settle = (next: 'open' | 'closed', ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (next === 'open') setSeen(true)
      setPhase((p) => (p === 'hidden' ? p : next))
    }, ms)
  }

  // Arrive, then rotate the teasers until the card has been seen.
  useEffect(() => {
    const t = window.setTimeout(() => setPhase((p) => (p === 'hidden' ? 'closed' : p)), ARRIVE_AFTER)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (seen || phase !== 'closed') return
    const t = window.setInterval(() => setTeaser((n) => (n + 1) % TEASERS.length), TEASE_EVERY)
    return () => window.clearInterval(t)
  }, [seen, phase])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Type the chat, one note per word, with typing dots before each bubble.
  // Replays on every reveal.
  useEffect(() => {
    if (!open) return setShown(0)
    if (prefersReducedMotion()) return setShown(TOTAL)
    let i = 0
    let word = 0
    let t = window.setTimeout(function tick() {
      if (isBubbleStart(i) || CHARS[i - 1] === ' ') onNote?.(WORD_NOTES[word++ % WORD_NOTES.length]!)
      setShown(++i)
      if (i < TOTAL) t = window.setTimeout(tick, isBubbleStart(i) ? TYPING_DOTS : CHAR_EVERY)
    }, TYPING_DOTS)
    return () => window.clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = seen ? SETTLED : TEASERS[teaser]

  return (
    <a
      className="island"
      href={CONTACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${AUTHOR} made Playhead and is open to work. ${CTA}: opens the contact page in a new tab`}
      data-phase={phase}
      data-unread={!seen || undefined}
      data-typing={(open && shown < TOTAL) || undefined}
      // Hover reveals for mice only; a tap on touch goes straight to the link.
      onPointerEnter={(e) => e.pointerType === 'mouse' && settle('open', HOVER_INTENT)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && settle('closed', LEAVE_GRACE)}
      onFocus={() => settle('open', 0)}
      onBlur={() => settle('closed', 0)}
      onKeyDown={(e) => e.key === 'Escape' && settle('closed', 0)}
      onPointerDown={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        setBurst((b) => ({ n: b.n + 1, x: e.clientX - box.left, y: e.clientY - box.top }))
        onNote?.(96)
      }}
    >
      <span className="island__peek" aria-hidden="true">
        <span className="island__avatar">IC</span>
        <span className="island__text">
          <span className="island__from">
            {open ? (
              <span className="island__name" onPointerOver={(e) => playLetter(e.target, onNote)}>
                {[...AUTHOR].map((char, i) => (
                  <span
                    key={i}
                    className="island__char"
                    data-midi={char === ' ' ? undefined : letterMidi(i)}
                    style={{ '--i': i, '--note': pitchColor(letterMidi(i)) } as CSSProperties}
                  >
                    {char === ' ' ? '\u00a0' : char}
                  </span>
                ))}
              </span>
            ) : (
              FIRST_NAME
            )}
            <span className="island__time">now</span>
          </span>
          {open ? (
            <span className="island__role">{ROLE}</span>
          ) : (
            <span key={preview} className="island__preview">{preview}</span>
          )}
        </span>
        {open ? (
          <span className="island__eq"><i /><i /><i /><i /></span>
        ) : (
          <span className="island__chip">{CTA}<Arrow /></span>
        )}
      </span>

      <span className="island__body" aria-hidden="true">
        <span className="island__inner">
          <span className="island__thread">
            {BUBBLES.map(({ chars, start }) => {
              const typed = Math.max(0, Math.min(chars.length, shown - start))
              const waiting = open && shown === start // dots before this bubble
              if (!typed && !waiting) return null
              return (
                <span key={start} className="island__bubble">
                  {waiting ? (
                    <span className="island__dots"><i /><i /><i /></span>
                  ) : (
                    <>
                      {chars.slice(0, typed).join('')}
                      {typed < chars.length && <span className="island__caret" />}
                    </>
                  )}
                </span>
              )
            })}
          </span>
          <span className="island__reply">{CTA}<Arrow /></span>
        </span>
      </span>

      {burst.n > 0 && (
        <span key={burst.n} className="island__sparks" style={{ left: burst.x, top: burst.y }} aria-hidden="true">
          {SPARK_STYLES.map((style, i) => <i key={i} style={style} />)}
        </span>
      )}
    </a>
  )
}

/** The "opens elsewhere" arrow; it hops up-right on hover (see styles.css). */
function Arrow() {
  return (
    <svg className="island__arrow" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2.5 7.5 7.5 2.5M3.5 2.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Plays the letter under the pointer, if it is one. Delegated, so one handler serves all letters. */
function playLetter(target: EventTarget, onNote?: (midi: number) => void) {
  const midi = (target as HTMLElement).dataset?.midi
  if (midi) onNote?.(Number(midi))
}
