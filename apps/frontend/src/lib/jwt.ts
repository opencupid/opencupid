import type { JwtPayload } from '@zod/user/user.dto'

/**
 * The claims of a session JWT, or null if it is malformed. Only decodes: the
 * signature is the backend's to verify.
 */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1]!)) as JwtPayload
  } catch {
    return null
  }
}
