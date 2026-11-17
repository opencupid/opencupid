import { createHash } from 'node:crypto'
import type Redis from 'ioredis'
import type { Brand } from '@/lib/brand'
import { lookupNetwork, type IpNetwork } from '@/lib/geoip'
import { sendUmamiEvent } from '@/lib/umami'

/**
 * Diagnostics for magic-link verification: sends one Umami event per
 * verify-token call, describing who presented the token. The question it
 * answers is whether link checkers (mail providers' scanners, server-side
 * renderers) use up tokens before the user does.
 *
 * A used token is cleared from the user row, so a second presentation is
 * indistinguishable from a made-up token. To tell them apart, each successful
 * verify is remembered in Redis for a day (when, client IP and user agent),
 * and a later miss with the same token is reported as `already_used`
 * together with who used it.
 */

const USED_KEY_PREFIX = 'magic-link:used:'
const USED_TTL_SECONDS = 24 * 60 * 60
const MAX_UA_LENGTH = 250

export type VerifyOutcome = 'consumed' | 'expired' | 'invalid'
export type VerifyClient = { ip: string; userAgent: string }

type UsedRecord = VerifyClient & { at: number }

// Tokens are only stored hashed.
function usedKey(token: string): string {
  return USED_KEY_PREFIX + createHash('sha256').update(token).digest('hex')
}

function describe(prefix: string, network: IpNetwork | null, userAgent: string) {
  return {
    [`${prefix}Network`]: network?.asnOrganization ?? 'unknown',
    [`${prefix}Asn`]: network?.asn ?? 0,
    [`${prefix}Country`]: network?.country ?? 'unknown',
    [`${prefix}Ua`]: userAgent.slice(0, MAX_UA_LENGTH),
  }
}

/**
 * Records and reports one verify-token result. Call without awaiting; it
 * never throws. The Redis write for `consumed` is issued before the first
 * await, so it is queued ahead of any later request's lookup.
 */
export async function trackMagicLinkVerify(
  redis: Redis,
  brand: Brand,
  args: { token: string; outcome: VerifyOutcome; client: VerifyClient; tokenIssuedAt?: Date }
): Promise<void> {
  if (!brand.umami) return
  const { token, outcome, client, tokenIssuedAt } = args
  const now = Date.now()

  try {
    let used: UsedRecord | null = null
    if (outcome === 'consumed') {
      const record: UsedRecord = { ...client, at: now }
      await redis.set(usedKey(token), JSON.stringify(record), 'EX', USED_TTL_SECONDS)
    } else if (outcome === 'invalid') {
      const raw = await redis.get(usedKey(token))
      used = raw ? (JSON.parse(raw) as UsedRecord) : null
    }

    const [network, consumerNetwork] = await Promise.all([
      lookupNetwork(client.ip),
      used ? lookupNetwork(used.ip) : null,
    ])

    const data: Record<string, string | number | boolean> = {
      outcome: outcome === 'invalid' ? (used ? 'already_used' : 'unknown_token') : outcome,
      ...describe('client', network, client.userAgent),
    }
    if (outcome === 'consumed' && tokenIssuedAt) {
      data.secondsSinceIssued = Math.round((now - tokenIssuedAt.getTime()) / 1000)
    }
    if (used) {
      Object.assign(data, describe('consumer', consumerNetwork, used.userAgent), {
        secondsSinceConsumed: Math.round((now - used.at) / 1000),
        sameIp: used.ip === client.ip,
        sameUa: used.userAgent === client.userAgent,
      })
    }

    await sendUmamiEvent(brand, {
      name: 'magic-link-verify',
      url: '/magic-link',
      data,
      ip: client.ip,
    })
  } catch {
    // Diagnostics only: a Redis or parse failure must not affect login.
  }
}
