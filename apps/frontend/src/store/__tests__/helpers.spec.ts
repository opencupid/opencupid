import { describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'

vi.mock('@/lib/bus', () => ({ bus: { emit: vi.fn() } }))

import { storeError } from '../helpers'

describe('storeError', () => {
  it('keeps the status and message of an HTTP error response', () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 404,
      data: { success: false, message: 'Conversation not found' },
    } as any)

    expect(storeError(error)).toMatchObject({
      success: false,
      status: 404,
      message: 'Conversation not found',
    })
  })

  it('handles a request that got no response at all (offline, timeout)', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(storeError(error)).toMatchObject({
      success: false,
      status: 500,
      message: 'Request failed',
    })
  })
})
