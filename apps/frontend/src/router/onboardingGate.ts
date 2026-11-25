import Cookies from 'universal-cookie'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { SESSION_COOKIE } from '@shared/session'
import { parseJwtPayload } from '@/lib/jwt'
import { utmQuery } from './loginRedirect'

// Reads the cookie, not a store: the backend replaces the JWT when onboarding
// completes, and the cookie is current at once, in every tab.
function isOnboardingPending(): boolean {
  const token = new Cookies().get<string | undefined>(SESSION_COOKIE)
  return token !== undefined && parseJwtPayload(token)?.pending === true
}

/**
 * The redirect to Onboarding for a user who hasn't finished it, if `to` needs
 * one. Must stay synchronous: the app mounts after the first navigation, so
 * waiting for the API would leave the user on the splash. A token that is out of
 * date is corrected by Onboarding.vue.
 */
export function onboardingRedirect(
  to: Pick<RouteLocationNormalized, 'name' | 'meta' | 'query'>
): RouteLocationRaw | undefined {
  if (!to.meta.requiresAuth || to.name === 'Onboarding' || !isOnboardingPending()) return undefined
  return { name: 'Onboarding', query: utmQuery(to.query), replace: true }
}
