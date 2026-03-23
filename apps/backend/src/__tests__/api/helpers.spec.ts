import { describe, it, expect } from 'vitest'
import {
  sendError,
  sendForbiddenError,
  sendUnauthorizedError,
  getUserRoles,
  addDebounceHeaders,
} from '../../api/helpers'
import { MockReply } from '../../test-utils/fastify'

const reply = new MockReply()

describe('helpers.sendError', () => {
  it('sends structured error', () => {
    sendError(reply as any, 400, 'Bad', { field: ['err'] })
    expect(reply.statusCode).toBe(400)
    expect(reply.payload).toEqual({
      success: false,
      message: 'Bad',
      fieldErrors: { field: ['err'] },
    })
  })
})

describe('helpers.shortcuts', () => {
  it('unauthorized', () => {
    sendUnauthorizedError(reply as any)
    expect(reply.statusCode).toBe(401)
  })
  it('forbidden', () => {
    sendForbiddenError(reply as any)
    expect(reply.statusCode).toBe(403)
  })
})

describe('getUserRoles', () => {
  it('returns roles from session', () => {
    const req: any = { session: { roles: ['admin'] } }
    expect(getUserRoles(req)).toEqual(['admin'])
  })
})

describe('addDebounceHeaders', () => {
  it('sets cache control and debounce headers', () => {
    const rep = new MockReply()
    addDebounceHeaders(rep as any)
    expect(rep.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate')
    expect(rep.headers['X-Debounce']).toBe('300')
  })
})
