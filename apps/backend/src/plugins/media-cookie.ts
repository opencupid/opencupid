import type { FastifyReply } from 'fastify'
import '@fastify/cookie'
import { generateMediaToken } from '@/lib/media'
import { appConfig } from '@/lib/appconfig'

const COOKIE_NAME = '__media_token'
const COOKIE_PATH = '/user-content/'

export function setMediaCookie(reply: FastifyReply): void {
  const { value, maxAge } = generateMediaToken()
  reply.setCookie(COOKIE_NAME, value, {
    path: COOKIE_PATH,
    httpOnly: true,
    secure: appConfig.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge,
  })
}

export function clearMediaCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: COOKIE_PATH })
}
