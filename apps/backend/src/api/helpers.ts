import { UserRole } from '@prisma/client'
import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { appConfig } from '@shared/config/appconfig'

// --- Helper to send uniform error responses ---
export function sendError(
  reply: FastifyPluginAsync['prototype']['reply'],
  statusCode: number,
  message: string,
  fieldErrors?: Record<string, string[]>
) {
  const payload: any = { success: false, message }
  if (fieldErrors) payload.fieldErrors = fieldErrors
  return reply.code(statusCode).send(payload)
}

export function sendUnauthorizedError(
  reply: FastifyPluginAsync['prototype']['reply'],
  message: string = 'Unauthorized'
) {
  return sendError(reply, 401, message)
}


export function sendForbiddenError(
  reply: FastifyPluginAsync['prototype']['reply'],
  message: string = 'Forbidden'
) {
  return sendError(reply, 403, message)
}

export function getUserRoles(req: FastifyRequest): UserRole[] {
  return req.session?.roles || []
}

export function addDebounceHeaders(
  reply: FastifyPluginAsync['prototype']['reply'],
) {
  // disable caching and inform client of debounce interval
  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  reply.header('X-Debounce', appConfig.TYPEAHEAD_DEBOUNCE_MS.toString())
}