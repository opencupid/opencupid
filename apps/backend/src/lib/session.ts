/**
 * Backend-side cookie helpers for the session / refresh / origin cookies.
 * Centralizes every Fastify `setCookie`/`clearCookie` call that touches these
 * names so the cookie shape is decided in exactly one place per operation.
 *
 * Platform-agnostic primitives (cookie names, max-ages, `resolveSessionCookie`,
 * `canScopeToDomain`) live in `@shared/session`; migration-only helpers live
 * alongside in `./session-legacy` and get deleted post-sunset.
 */
import { FastifyReply, FastifyRequest } from 'fastify'
import '@fastify/cookie'
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTS,
  SESSION_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  ORIGIN_COOKIE,
  ORIGIN_MAX_AGE,
  resolveSessionCookie,
} from '@shared/session'
import { clearLegacyCookie } from './session-legacy'
import { appConfig } from '@/lib/appconfig'

function currentSessionCookieOpts() {
  return resolveSessionCookie(appConfig.NODE_ENV, appConfig.DOMAIN)
}

export function getSessionCookie(req: FastifyRequest): string | undefined {
  return req.cookies[SESSION_COOKIE]
}

export function getRefreshCookie(req: FastifyRequest): string | undefined {
  return req.cookies[REFRESH_COOKIE]
}

export function setSessionCookie(reply: FastifyReply, jwt: string) {
  reply.setCookie(SESSION_COOKIE, jwt, {
    ...currentSessionCookieOpts(),
    httpOnly: false,
    secure: appConfig.NODE_ENV !== 'development',
    maxAge: SESSION_MAX_AGE,
  })
  clearLegacyCookie(reply, SESSION_COOKIE)
}

export function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    ...currentSessionCookieOpts(),
    httpOnly: true,
    secure: appConfig.NODE_ENV !== 'development',
    maxAge: REFRESH_MAX_AGE,
  })
  clearLegacyCookie(reply, REFRESH_COOKIE)
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, currentSessionCookieOpts())
  clearLegacyCookie(reply, SESSION_COOKIE)
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, currentSessionCookieOpts())
  clearLegacyCookie(reply, REFRESH_COOKIE)
}

/**
 * Stamps the __o cookie authoritatively on any host where login activity
 * occurs. Rewriting on every send and consume (not only cross-brand ones)
 * prevents ping-pong loops caused by stale __o values left on both brands
 * pointing at each other.
 */
export function setOriginCookie(reply: FastifyReply, originDomain: string | null | undefined) {
  if (!originDomain) return
  if (appConfig.NODE_ENV === 'development') return
  reply.setCookie(ORIGIN_COOKIE, originDomain, {
    ...SESSION_COOKIE_OPTS,
    secure: true,
    maxAge: ORIGIN_MAX_AGE,
  })
}
