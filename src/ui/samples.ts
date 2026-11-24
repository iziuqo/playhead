import { parseNoteName } from '../core'

/**
 * Salamander Grand Piano samples (CC-BY 3.0, Alexander Holm), one every three
 * semitones from C2 to C7. File names are note names with "s" for sharp
 * (Ds4.mp3 = D♯4). Vite turns each import into a URL.
 */
const files = import.meta.glob<string>('../assets/samples/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const SAMPLE_URLS: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => {
    const name = path.split('/').pop()!.replace('.mp3', '').replace('s', '#')
    return [parseNoteName(name), url]
  }),
)
