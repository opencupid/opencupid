import { appConfig, type Brand } from './appconfig'

export type { Brand }

/**
 * Every brand served by this database (appconfig's loadBrands: one per file in
 * BRANDS_DIR, or a single brand from the process env). Brand identity is
 * carried on outbound content (email payloads, future: SMS, push, analytics).
 */
const registry: Brand[] = appConfig.brands

/** The browser origin of every brand's frontend, for CORS. */
export function frontendOrigins(): string[] {
  return registry.map((b) => new URL(b.frontendUrl).origin)
}

/** Thrown when a request arrives on a host that belongs to no brand. */
export class UnknownHostError extends Error {
  readonly statusCode = 421
  constructor(readonly hostname: string) {
    super(`No brand serves host ${hostname}`)
    this.name = 'UnknownHostError'
  }
}

/**
 * The brand a request was made to, by its host: the brand whose domain is the
 * host itself or one of its parents (www., app., admin. etc.). A host no brand
 * serves is rejected rather than answered as some default brand.
 */
export function brandForHost(hostname: string): Brand {
  const host = hostname.toLowerCase()
  const brand = registry.find((b) => host === b.domain || host.endsWith(`.${b.domain}`))
  if (!brand) throw new UnknownHostError(hostname)
  return brand
}

/**
 * The brand a recipient belongs to, by their User.originDomain. Content sent to
 * a user must carry their brand, not the sending process's: one database and
 * one worker serve every brand. Every originDomain is recorded from a brand
 * (brandForHost), so a miss means the brand list and the data disagree.
 */
export function brandFor(domain: string): Brand {
  const brand = registry.find((b) => b.domain === domain)
  if (!brand) throw new Error(`No brand for domain ${domain}`)
  return brand
}
