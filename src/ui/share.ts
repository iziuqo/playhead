import { decodeMelody, encodeMelody, type Melody } from '../core'

/** Hash key for a melody inside a share link: …/#m=<code>. */
const PARAM = 'm'

export const melodyLink = (melody: Melody): string =>
  `${location.origin}${location.pathname}#${PARAM}=${encodeMelody(melody)}`

/** The melody in the current URL, if someone shared one. */
export function melodyFromLocation(): Melody | undefined {
  const code = new URLSearchParams(location.hash.slice(1)).get(PARAM)
  if (!code) return undefined
  try {
    return decodeMelody(code)
  } catch {
    return undefined
  }
}

/** Copies text, falling back to a hidden textarea where the Clipboard API is blocked (iframes). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text })
    area.style.cssText = 'position:fixed;opacity:0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
