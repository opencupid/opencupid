const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/**
 * Canonicalize an email address for use as an account identifier.
 *
 * Applies to ALL domains: trim surrounding whitespace and lowercase.
 * For Gmail (gmail.com / googlemail.com) ONLY, additionally normalize the
 * local part the way Gmail's own mail server does — dots are insignificant
 * and everything after the first '+' is ignored — so that j.smith@gmail.com,
 * jsmith@gmail.com and j.smith+tag@gmail.com resolve to one identity.
 *
 * The dot/plus rule is provider-specific (per RFC 5321 only the receiving
 * host may interpret the local part) and is gated behind a domain allowlist.
 */
export function canonicalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.lastIndexOf('@')
  if (atIndex === -1) return normalized

  const local = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)
  if (!GMAIL_DOMAINS.has(domain)) return normalized

  const canonicalLocal = local.split('+', 1)[0].replace(/\./g, '')
  // A leading '+' or an all-dots local part (e.g. '+tag@gmail.com', '.@gmail.com')
  // would canonicalize to an empty local part — an invalid address and a
  // degenerate shared identifier. Keep the trim/lowercased form in that case.
  if (canonicalLocal === '') return normalized
  return `${canonicalLocal}@${domain}`
}
