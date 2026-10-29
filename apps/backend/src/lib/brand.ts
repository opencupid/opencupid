import { appConfig } from './appconfig'
import { logger } from './logger'

/**
 * Brand identity carried on outbound content (email payloads, future: SMS,
 * push, analytics). Lives in lib/ rather than services/email/ so non-email
 * consumers can import it without reaching into an email-specific module.
 */
export type Brand = {
  siteName: string
  frontendUrl: string
  domain: string
  emailFrom: string
  emailReplyTo?: string
}

/**
 * Every brand served by this database. Multi-brand deployments list them in
 * BRANDS; single-brand deployments get one brand built from the process env.
 */
const registry: Brand[] = appConfig.BRANDS ?? [
  {
    siteName: appConfig.SITE_NAME,
    frontendUrl: appConfig.FRONTEND_URL,
    domain: appConfig.DOMAIN,
    emailFrom: appConfig.EMAIL_FROM,
    emailReplyTo: appConfig.EMAIL_REPLY_TO,
  },
]

/**
 * The brand this process serves (its DOMAIN). appconfig guarantees BRANDS
 * contains it, so the lookup cannot miss.
 */
export function currentBrand(): Brand {
  return registry.find((b) => b.domain === appConfig.DOMAIN)!
}

/**
 * The brand a recipient belongs to, by their User.originDomain. Content sent to
 * a user must carry their brand, not the sending process's: one database and
 * one worker serve every brand.
 */
export function brandFor(domain: string): Brand {
  const brand = registry.find((b) => b.domain === domain)
  if (brand) return brand
  logger.warn({ domain, fallback: appConfig.DOMAIN }, 'unknown brand domain, using process brand')
  return currentBrand()
}
