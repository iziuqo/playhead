import { parseScore } from './score'
import type { Melody } from './types'

/**
 * Practice songs. **Public-domain melodies only**, in our own simple
 * arrangements (right hand). Add a song by appending one entry; nothing else
 * needs to change.
 */
export interface Song extends Melody {
  id: string
  composer: string
  /** 1 = first-day friendly, 3 = needs both hands of attention. */
  difficulty: 1 | 2 | 3
}

const song = (
  id: string,
  title: string,
  composer: string,
  difficulty: Song['difficulty'],
  bpm: number,
  notation: string,
): Song => ({ id, composer, difficulty, ...parseScore(title, notation, bpm) })

export const SONGS: readonly Song[] = [
  song('twinkle', 'Twinkle, Twinkle', 'Traditional', 1, 100,
    'C4 C4 G4 G4 A4 A4 G4*2 F4 F4 E4 E4 D4 D4 C4*2'),
  song('ode-to-joy', 'Ode to Joy', 'Beethoven', 1, 110,
    'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4*1.5 D4/2 D4*2 ' +
    'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4*1.5 C4/2 C4*2'),
  song('jingle-bells', 'Jingle Bells', 'J. L. Pierpont', 2, 130,
    'E4 E4 E4*2 E4 E4 E4*2 E4 G4 C4*1.5 D4/2 E4*4 ' +
    'F4 F4 F4*1.5 F4/2 F4 E4 E4 E4/2 E4/2 E4 D4 D4 E4 D4*2 G4*2'),
  song('fur-elise', 'Für Elise', 'Beethoven', 2, 132,
    'E5/2 D#5/2 E5/2 D#5/2 E5/2 B4/2 D5/2 C5/2 A4*1.5 ' +
    'C4/2 E4/2 A4/2 B4*1.5 E4/2 G#4/2 B4/2 C5*1.5 ' +
    'E4/2 E5/2 D#5/2 E5/2 D#5/2 E5/2 B4/2 D5/2 C5/2 A4*2'),
  song('canon', 'Canon in D', 'Pachelbel', 3, 72,
    'F#5 E5 D5 C#5 B4 A4 B4 C#5 D5/2 C#5/2 B4/2 A4/2 G4/2 F#4/2 G4/2 E4/2 F#4*2'),
]

export const findSong = (id: string): Song | undefined => SONGS.find((s) => s.id === id)
