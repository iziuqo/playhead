import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  SONGS, dailyNumber, dailyTune, judgementEmoji, noteName, pitchColor,
  type Melody, type PracticeMode, type PracticeResult, type Song, type Timbre,
} from './core'
import { Brand } from './ui/Brand'
import { Credit } from './ui/Credit'
import { FocusCue } from './ui/FocusCue'
import { Keyboard } from './ui/Keyboard'
import { Stage } from './ui/Stage'
import { keyLayout, rangeForWidth } from './ui/layout'
import { usePiano } from './ui/usePiano'
import { useGame } from './ui/useGame'
import { useKeyboardFocus } from './ui/useKeyboardFocus'
import { copyText, melodyFromLocation, melodyLink } from './ui/share'
import { loadStreak, recordDaily } from './ui/streak'

type Mode = 'play' | 'practice' | 'daily'

const MODES: { id: Mode; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'practice', label: 'Learn' },
  { id: 'daily', label: 'Daily' },
]
const TIMBRES: { id: Timbre; label: string }[] = [
  { id: 'grand', label: 'Grand' },
  { id: 'felt', label: 'Felt' },
  { id: 'musicbox', label: 'Music box' },
]
const JUDGEMENT_LABEL = { perfect: 'Perfect', good: 'Good', miss: 'Miss' } as const
/** "Play." spelled as a C major 7 arpeggio: each letter wears its note's colour. */
const HERO_LETTERS = [...'Play.'].map((char, i) => ({ char, note: pitchColor(60 + [0, 4, 7, 11, 12][i]!) }))

/** Keeps the keyboard range in sync with the window width. */
function useRange(): [number, number] {
  const [range, setRange] = useState(() => rangeForWidth(window.innerWidth))
  useEffect(() => {
    const onResize = () => {
      const next = rangeForWidth(window.innerWidth)
      setRange((prev) => (prev[0] === next[0] ? prev : next))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return range
}

export function App() {
  const range = useRange()
  const keys = useMemo(() => keyLayout(range[0], range[1]), [range])
  const today = dailyNumber()
  const [mode, setMode] = useState<Mode>('play')
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('wait')
  const [streak, setStreak] = useState(() => loadStreak().streak)
  const [toast, setToast] = useState<string>()
  const [shared] = useState<Melody | undefined>(melodyFromLocation)
  const [showShared, setShowShared] = useState(Boolean(shared))
  const [lastTake, setLastTake] = useState<Melody>()

  const game = useGame((song, result) => {
    if (song.id.startsWith('daily-')) setStreak(recordDaily(today, result.accuracy).streak)
  })
  const piano = usePiano({ range, onPlayed: game.onPlayed })
  const focus = useKeyboardFocus()
  // Celebrate keyboard focus with a soft chime (only audible once audio is unlocked).
  useEffect(() => {
    if (focus.woke) piano.chime()
  }, [focus.woke]) // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(undefined), 2200)
  }

  const switchMode = (next: Mode) => {
    game.stop()
    piano.stopPlayback()
    setMode(next)
  }

  const toggleRecording = async () => {
    if (!piano.recording) return piano.startRecording()
    const notes = piano.stopRecording()
    if (!notes.length) return notify('Nothing recorded yet. Play a few notes first.')
    const take = { title: 'My Playhead take', notes }
    setLastTake(take)
    notify((await copyText(melodyLink(take))) ? 'Link copied. Send it to someone 🎹' : 'Recorded. Copy failed, try again.')
  }

  const shareResult = async (song: Song, result: PracticeResult) => {
    const title = song.id.startsWith('daily-') ? `Playhead ${song.title}` : `Playhead · ${song.title}`
    const text = `${title} 🎹 ${Math.round(result.accuracy * 100)}%${streak > 1 ? ` · 🔥${streak}` : ''}\n${judgementEmoji(result.judgements)}\n${location.origin}${location.pathname}`
    notify((await copyText(text)) ? 'Result copied. Paste it anywhere.' : 'Copy failed, try again.')
  }

  // R toggles recording in free play.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'play') void toggleRecording()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const daily = useMemo(() => dailyTune(today), [today])
  const feedback = game.feedback

  return (
    <div className="app">
      <header className="bar">
        <Brand subscribe={piano.subscribe} range={range} />
        <Credit subscribe={piano.subscribe} onNote={(midi) => piano.chime([midi])} />

        <nav className="segmented" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => switchMode(m.id)}>
              {m.label}
              {m.id === 'daily' && streak > 0 && <span className="badge">🔥{streak}</span>}
            </button>
          ))}
        </nav>

        <div className="bar__end">
          <div className="segmented segmented--quiet" aria-label="Sound">
            {TIMBRES.map((t) => (
              <button key={t.id} type="button" aria-pressed={piano.timbre === t.id} onClick={() => piano.setTimbre(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {mode === 'play' && (
            <button type="button" className={`rec${piano.recording ? ' rec--on' : ''}`} onClick={toggleRecording}>
              <span className="rec__dot" aria-hidden="true" />
              {piano.recording ? 'Stop & copy link' : 'Record'}
            </button>
          )}
        </div>
      </header>

      <main className="studio">
        <section className="stage-wrap">
          <Stage keys={keys} subscribe={piano.subscribe} session={game.session} />

          <div className="overlay">
            {showShared && shared && (
              <div className="card card--center">
                <p className="eyebrow">Someone sent you a melody</p>
                <h1 className="title">{shared.title || 'A Playhead take'}</h1>
                <p className="muted">{shared.notes.length} notes, played on Playhead</p>
                <div className="row">
                  <button type="button" className="primary" onClick={() => { setShowShared(false); piano.playMelody(shared) }}>▶ Listen</button>
                  <button type="button" className="ghost" onClick={() => setShowShared(false)}>Play my own</button>
                </div>
              </div>
            )}

            {!showShared && mode === 'play' && (
              <div className="hero" aria-live="polite">
                <h1 className="hero__title" aria-label="Play.">
                  {HERO_LETTERS.map(({ char, note }, i) => (
                    <span key={i} aria-hidden="true" style={{ '--i': i, '--note': note } as CSSProperties}>{char}</span>
                  ))}
                </h1>
                <p className="hero__hint">
                  Use your keyboard: <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd>… for white keys, <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd>… for black keys
                </p>
                {lastTake && !piano.recording && (
                  <button type="button" className="ghost" onClick={() => piano.playMelody(lastTake)}>▶ Replay your take</button>
                )}
              </div>
            )}

            {mode === 'practice' && game.phase === 'idle' && (
              <div className="card">
                <p className="eyebrow">Learn a song</p>
                <ul className="songs">
                  {SONGS.map((song) => (
                    <li key={song.id}>
                      <button type="button" className="song" onClick={() => game.start(song, practiceMode)}>
                        <span className="song__title">{song.title}</span>
                        <span className="song__meta">{song.composer} · {'●'.repeat(song.difficulty)}{'○'.repeat(3 - song.difficulty)}</span>
                      </button>
                      <button type="button" className="icon" aria-label={`Listen to ${song.title}`} onClick={() => piano.playMelody(song)}>▶</button>
                    </li>
                  ))}
                </ul>
                <div className="segmented segmented--quiet" aria-label="Pace">
                  <button type="button" aria-pressed={practiceMode === 'wait'} onClick={() => setPracticeMode('wait')}>Waits for you</button>
                  <button type="button" aria-pressed={practiceMode === 'flow'} onClick={() => setPracticeMode('flow')}>Keeps time</button>
                </div>
              </div>
            )}

            {mode === 'daily' && game.phase === 'idle' && (
              <div className="card card--center">
                <p className="eyebrow">Daily Tune #{today}</p>
                <h1 className="title">Ten notes. One shot.</h1>
                <p className="muted">Same tune for everyone today. Listen once, then play it as the notes fall.</p>
                <div className="row">
                  <button type="button" className="ghost" onClick={() => piano.playMelody(daily)}>▶ Listen</button>
                  <button type="button" className="primary" onClick={() => game.start(daily, 'flow')}>Play</button>
                </div>
              </div>
            )}

            {game.phase === 'running' && (
              <>
                <div className="hud">
                  <span>{game.song?.title}</span>
                  <button type="button" className="ghost ghost--small" onClick={game.stop}>Stop</button>
                </div>
                {feedback && (
                  <div key={feedback.id} className={`judgement judgement--${feedback.judgement}`} aria-live="polite">
                    {JUDGEMENT_LABEL[feedback.judgement]}
                    {feedback.combo > 2 && <span className="combo">×{feedback.combo}</span>}
                  </div>
                )}
              </>
            )}

            {game.phase === 'done' && game.result && game.song && (
              <div className="card card--center">
                <p className="eyebrow">{game.song.title}</p>
                <div className="stats">
                  <div className="stat"><strong>{Math.round(game.result.accuracy * 100)}%</strong><span>accuracy</span></div>
                  <div className="stat"><strong>{game.result.bestCombo}</strong><span>best combo</span></div>
                  {game.song.id.startsWith('daily-') && <div className="stat"><strong>🔥{streak}</strong><span>day streak</span></div>}
                </div>
                <p className="grid" aria-label="Note by note result">{judgementEmoji(game.result.judgements)}</p>
                <div className="row">
                  <button type="button" className="primary" onClick={() => shareResult(game.song!, game.result!)}>Share result</button>
                  <button type="button" className="ghost" onClick={() => game.start(game.song!, mode === 'daily' ? 'flow' : practiceMode)}>Try again</button>
                  <button type="button" className="ghost" onClick={game.stop}>Done</button>
                </div>
              </div>
            )}
          </div>

          {toast && <div className="toast" role="status">{toast}</div>}
        </section>

        <div className="deck" data-keys={focus.focused ? 'live' : 'asleep'} data-woke={focus.woke || undefined}>
          <FocusCue focused={focus.focused} />
          <Keyboard
            keys={keys}
            pressed={piano.pressed}
            guide={game.guide}
            baseOctaveC={piano.baseOctaveC}
            onPress={piano.press}
            onRelease={piano.release}
          />
        </div>

        <footer className="hints">
          <span><kbd>Z</kbd><kbd>X</kbd> octave · {noteName(piano.baseOctaveC)}</span>
          <span><kbd>Space</kbd> sustain</span>
          {mode === 'play' && <span><kbd>R</kbd> record</span>}
          {!piano.ready && <span className="hints__status">Loading piano…</span>}
        </footer>
      </main>
    </div>
  )
}
