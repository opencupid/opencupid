import type { LocationQuery, RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { LoginRedirectSchema } from '@zod/user/user.dto'

export const DEFAULT_LANDING = '/browse'

const isUtmKey = (key: string) => key.startsWith('utm_')

/**
 * The `utm_*` keys of a query. Umami loads after the router's first
 * navigation, so it records the page after a redirect; the Login redirect
 * carries these over so that page still has the email campaign.
 */
function utmQuery(query: LocationQuery): LocationQuery {
  return Object.fromEntries(Object.entries(query).filter(([key]) => isUtmKey(key)))
}

/** `fullPath` without its `utm_*` keys. */
function withoutUtm(target: Pick<RouteLocationNormalized, 'fullPath' | 'query'>): string {
  if (!Object.keys(target.query).some(isUtmKey)) return target.fullPath
  const url = new URL(target.fullPath, 'http://localhost')
  for (const key of [...url.searchParams.keys()].filter(isUtmKey)) url.searchParams.delete(key)
  return url.pathname + url.search + url.hash
}

/**
 * The Login route, remembering `target` as the place to return to after
 * login. The default landing page needs no remembering. UTM tags move to the
 * Login route itself, so the campaign is counted once, on the page Umami
 * records, and not again after login.
 */
export function loginRoute(
  target: Pick<RouteLocationNormalized, 'meta' | 'fullPath' | 'query'>
): RouteLocationRaw {
  const returnTo = withoutUtm(target)
  const remember = target.meta.requiresAuth && returnTo !== DEFAULT_LANDING
  return {
    name: 'Login',
    query: { ...utmQuery(target.query), ...(remember ? { redirect: returnTo } : {}) },
  }
}

/**
 * Validates a `redirect` query value: returns it only when it is an in-app
 * path that resolves to an authenticated route.
 */
export function loginRedirect(router: Router, raw: unknown): string | undefined {
  const parsed = LoginRedirectSchema.safeParse(raw)
  if (!parsed.success) return undefined
  const resolved = router.resolve(parsed.data)
  return resolved.meta.requiresAuth ? resolved.fullPath : undefined
}
