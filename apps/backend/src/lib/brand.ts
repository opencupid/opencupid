import { appConfig } from './appconfig'

/**
 * Brand identity carried on outbound content (email payloads, future: SMS,
 * push, analytics). Lives in lib/ rather than services/email/ so non-email
 * consumers can import it without reaching into an email-specific module.
 */
export type Brand = {
  siteName: string
  frontendUrl: string
  domain: string
}

/**
 * Single projection of process env → Brand for producer-side rendering.
 * Every path that stamps brand identity goes through this so there's exactly
 * one place where brand strings are sourced. Under per-brand-stack deployment
 * each API container's env already matches the user's brand.
 */
export function currentBrand(): Brand {
  return {
    siteName: appConfig.SITE_NAME,
    frontendUrl: appConfig.FRONTEND_URL,
    domain: appConfig.DOMAIN,
  }
}
