import { useEffect, useRef } from 'react'
import { pitchColor, type PracticeSession } from '../core'
import type { KeyGeometry } from './layout'
import type { NoteSignal } from './usePiano'

interface Props {
  keys: readonly KeyGeometry[]
  subscribe: (fn: (signal: NoteSignal) => void) => () => void
  /** When set, draws the song's notes falling toward the keys. */
  session?: PracticeSession
}

/** Pixels per second of music, for both rising trails and falling notes. */
const SPEED = 150
const TRAIL_LIFETIME_MS = 6000
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Trail { midi: number; start: number; end?: number; velocity: number }
interface Spark { x: number; y: number; vx: number; vy: number; born: number; color: string }

/**
 * The glowing area above the keys, drawn on one <canvas> at 60 fps.
 * - Free play: every note leaves a light trail that rises and fades.
 * - Practice: notes fall onto the keys; hit them as they touch the line.
 */
export function Stage({ keys, subscribe, session }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const trails: Trail[] = []
    const sparks: Spark[] = []
    const byMidi = new Map(keys.map((k) => [k.midi, k]))
    let width = 0
    let height = 0
    let frame = 0

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const unsubscribe = subscribe((s) => {
      if (s.type === 'on') {
        trails.push({ midi: s.midi, start: s.at, velocity: s.velocity })
        const key = byMidi.get(s.midi)
        if (key && !reducedMotion()) {
          const x = (key.x + key.width / 2) * width
          for (let i = 0; i < 6; i++) {
            sparks.push({ x, y: height, vx: (Math.random() - 0.5) * 1.6, vy: -1 - Math.random() * 2.2, born: s.at, color: pitchColor(s.midi) })
          }
        }
      } else {
        const open = [...trails].reverse().find((t) => t.midi === s.midi && t.end === undefined)
        if (open) open.end = s.at
      }
    })

    /** A rounded, glowing note capsule. */
    const pill = (x: number, y: number, w: number, h: number, color: string, alpha: number, glow: number) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = glow
      ctx.beginPath()
      ctx.roundRect(x, y, w, Math.max(h, 6), Math.min(6, w / 2))
      ctx.fill()
    }

    const drawLanes = () => {
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      for (const k of keys) if (k.midi % 12 === 0) ctx.fillRect(k.x * width, 0, 1, height)
    }

    const drawTrails = (now: number) => {
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i]!
        const key = byMidi.get(t.midi)
        const age = now - (t.end ?? now)
        if (!key || age > TRAIL_LIFETIME_MS) { trails.splice(i, 1); continue }
        const top = height - ((now - t.start) / 1000) * SPEED
        const bottom = height - ((now - (t.end ?? now)) / 1000) * SPEED
        const fade = 1 - age / TRAIL_LIFETIME_MS
        const inset = key.width * width * 0.14
        pill(key.x * width + inset, top, key.width * width - inset * 2, bottom - top, pitchColor(t.midi), 0.85 * fade, 18 * fade)
      }
    }

    const drawSong = (s: PracticeSession, now: number) => {
      const songTime = s.songTime(now)
      // The hit line, where notes touch the keys.
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      const line = ctx.createLinearGradient(0, 0, width, 0)
      line.addColorStop(0, 'rgba(255,181,71,0)')
      line.addColorStop(0.5, 'rgba(255,181,71,0.55)')
      line.addColorStop(1, 'rgba(255,181,71,0)')
      ctx.fillStyle = line
      ctx.fillRect(0, height - 2, width, 2)

      s.notes.forEach((note, index) => {
        const key = byMidi.get(note.midi)
        if (!key) return
        const bottom = height - (note.time - songTime) * SPEED
        const top = bottom - note.duration * SPEED
        if (top > height + 40 || bottom < -20) return
        const judgement = s.judgementOf(index)
        const inset = key.width * width * 0.1
        const color = judgement === 'miss' ? 'rgba(255,255,255,0.18)' : pitchColor(note.midi)
        const alpha = judgement === 'perfect' || judgement === 'good' ? 0.35 : 0.95
        pill(key.x * width + inset, top, key.width * width - inset * 2, bottom - top, color, alpha, judgement ? 0 : 14)
      })
    }

    const drawSparks = (now: number) => {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]!
        const life = (now - p.born) / 700
        if (life >= 1) { sparks.splice(i, 1); continue }
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.03
        ctx.globalAlpha = 1 - life
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const render = () => {
      const now = performance.now()
      ctx.clearRect(0, 0, width, height)
      drawLanes()
      const s = sessionRef.current
      if (s) drawSong(s, now)
      drawTrails(now)
      drawSparks(now)
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
    }
  }, [keys, subscribe])

  return <canvas ref={canvasRef} className="stage" aria-hidden="true" />
}
