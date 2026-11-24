/**
 * Daily Tune streak, kept in this browser only (no accounts, no server).
 */
const KEY = 'playhead.daily.v1'

interface Saved { lastDay: number; streak: number; best: Record<number, number> }

const read = (): Saved => {
  try {
    return { lastDay: 0, streak: 0, best: {}, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { lastDay: 0, streak: 0, best: {} }
  }
}

export const loadStreak = (): Saved => read()

/** Records a finished Daily Tune and returns the updated streak. */
export function recordDaily(day: number, accuracy: number): Saved {
  const saved = read()
  const streak = saved.lastDay === day ? saved.streak : saved.lastDay === day - 1 ? saved.streak + 1 : 1
  const next: Saved = {
    lastDay: day,
    streak,
    best: { ...saved.best, [day]: Math.max(saved.best[day] ?? 0, accuracy) },
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* Storage can be blocked in embeds; the streak just won't persist. */
  }
  return next
}
