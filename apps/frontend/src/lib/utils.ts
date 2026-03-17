// regexes for form validation
export const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
export const phoneRegex = /^\+[1-9]\d{10,14}$/ // E.164 style: +4320 1234567 or 06201234567
export const tokenRegex = /^\d{6}$/

export function toInitialCaps(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Fisher-Yates shuffle with a simple seeded PRNG so the order is
 * deterministic for a given seed but different across seeds.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  let s = seed
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 16807 + 0.5) % 1
    const j = Math.floor(s * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
