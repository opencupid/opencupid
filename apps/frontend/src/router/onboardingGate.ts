import Cookies from 'universal-cookie'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { SESSION_COOKIE } from '@shared/session'
import type { JwtPayload } from '@zod/user/user.dto'
import { utmQuery } from './loginRedirect'

/**
 * Whether the session JWT marks the user as not finished with onboarding.
 *
 * Read from the cookie rather than from a store: the backend replaces the JWT
 * when onboarding completes, and the cookie is current as soon as that response
 * arrives, in every tab.
 */
function isOnboardingPending(): boolean {
  const token = new Cookies().get<string | undefined>(SESSION_COOKIE)
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!)) as JwtPayload
    return payload.pending === true
  } catch {
    // authStore.initialize() clears a malformed session cookie
    return false
  }
}

/**
 * The redirect to Onboarding for a user who hasn't finished it, if `to` needs
 * one. Must stay synchronous: the app mounts after the first navigation, so
 * waiting for the API here would leave the user on the splash.
 *
 * Only a pending token redirects. A JWT can be out of date (onboarding finished
 * on another device), which Onboarding.vue corrects once the profile is loaded.
 *
 * Replaces the history entry, so going back during the wizard doesn't land on a
 * page that redirects here again. UTM tags are carried over for Umami, as in
 * `loginRoute`.
 */
export function onboardingRedirect(
  to: Pick<RouteLocationNormalized, 'name' | 'meta' | 'query'>
): RouteLocationRaw | undefined {
  if (!to.meta.requiresAuth || to.name === 'Onboarding' || !isOnboardingPending()) return undefined
  return { name: 'Onboarding', query: utmQuery(to.query), replace: true }
}
