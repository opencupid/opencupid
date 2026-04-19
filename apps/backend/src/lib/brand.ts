import { appConfig } from '@/lib/appconfig'
import type { Brand } from '@/services/email/types'

/**
 * Single projection of process env → Brand for producer-side rendering.
 * Every path that stamps brand identity onto outbound content (email payloads,
 * future: SMS, push, analytics) goes through this so there's exactly one place
 * where brand strings are sourced. Under per-brand-stack deployment each API
 * container's env already matches the user's brand.
 */
export function currentBrand(): Brand {
  return {
    siteName: appConfig.SITE_NAME,
    frontendUrl: appConfig.FRONTEND_URL,
    domain: appConfig.DOMAIN,
  }
}
