import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { LoginRedirectSchema } from '@zod/user/user.dto'

export const DEFAULT_LANDING = '/browse'

/**
 * The Login route, remembering `target` as the place to return to after
 * login. The default landing page needs no remembering.
 */
export function loginRoute(
  target: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>
): RouteLocationRaw {
  const remember = target.meta.requiresAuth && target.fullPath !== DEFAULT_LANDING
  return { name: 'Login', query: remember ? { redirect: target.fullPath } : {} }
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
