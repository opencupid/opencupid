// regexes for form validation
export const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
export const phoneRegex = /^\+[1-9]\d{10,14}$/ // E.164 style: +4320 1234567 or 06201234567
export const tokenRegex = /^\d{6}$/

export function toInitialCaps(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Return a shuffled copy of {@link arr}, deterministic for a given {@link seed}.
 */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  return [...arr]
    .map((v, i) => ({ v, k: Math.sin(seed * (i + 1)) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v)
}
