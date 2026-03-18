// regexes for form validation
export const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
export const phoneRegex = /^\+[1-9]\d{10,14}$/ // E.164 style: +4320 1234567 or 06201234567
export const tokenRegex = /^\d{6}$/

export function toInitialCaps(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  try {
    const raw = atob(base64url)
    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
  } catch (error) {
    console.error('Failed to decode base64 string:', error)
  }
  return new Uint8Array()
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
