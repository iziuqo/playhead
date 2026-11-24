import { describe, expect, it } from 'vitest'
import {
  PracticeSession, SONGS, dailyNumber, dailyTune, decodeMelody, encodeMelody,
  noteName, parseNoteName, parseScore, scaleNote, LEAD_IN,
} from './index'

describe('notes', () => {
  it('names middle C and parses back', () => {
    expect(noteName(60)).toBe('C4')
    expect(parseNoteName('F#4')).toBe(66)
  })
  it('walks scales across octaves', () => {
    expect(scaleNote(60, 'major', 7)).toBe(72)
    expect(scaleNote(60, 'pentatonic', -1)).toBe(57)
  })
})

describe('score notation', () => {
  it('handles lengths and rests', () => {
    const { notes } = parseScore('t', 'C4 r/2 E4*2', 60)
    expect(notes.map((n) => [n.midi, n.time])).toEqual([[60, 0], [64, 1.5]])
  })
  it('parses every bundled song', () => {
    SONGS.forEach((s) => expect(s.notes.length).toBeGreaterThan(8))
  })
})

describe('melody codec', () => {
  it('round-trips within 10 ms', () => {
    const melody = { title: 'Ode ✨', notes: SONGS[1]!.notes }
    const decoded = decodeMelody(encodeMelody(melody))
    expect(decoded.title).toBe('Ode ✨')
    decoded.notes.forEach((n, i) => {
      expect(n.midi).toBe(melody.notes[i]!.midi)
      expect(n.time).toBeCloseTo(melody.notes[i]!.time, 1)
    })
  })
  it('stays short enough for a link', () => {
    expect(encodeMelody(SONGS[1]!).length).toBeLessThan(200)
  })
})

describe('daily tune', () => {
  it('is deterministic and numbered from launch', () => {
    expect(dailyNumber(new Date(2026, 10, 24))).toBe(1)
    expect(dailyTune(5)).toEqual(dailyTune(5))
    expect(dailyTune(5).notes).not.toEqual(dailyTune(6).notes)
  })
})


describe('practice session', () => {
  const notes = parseScore('t', 'C4 D4', 60).notes
  it('scores a perfect hit in flow mode', () => {
    const s = new PracticeSession(notes, 'flow')
    s.start(0)
    expect(s.press(60, LEAD_IN * 1000)?.judgement).toBe('perfect')
    s.tick(LEAD_IN * 1000 + 2000)
    expect(s.result().judgements).toEqual(['perfect', 'miss'])
  })
  it('waits for the player in wait mode', () => {
    const s = new PracticeSession(notes, 'wait')
    s.start(0)
    s.tick(LEAD_IN * 1000 + 500)
    const frozen = s.songTime(LEAD_IN * 1000 + 5000)
    expect(frozen).toBeCloseTo(s.songTime(LEAD_IN * 1000 + 9000))
    expect(s.press(60, LEAD_IN * 1000 + 9000)?.judgement).toBe('perfect')
  })
})
