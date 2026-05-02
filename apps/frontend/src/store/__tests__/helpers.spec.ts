import { describe, it, expect, vi } from 'vitest'
import { AxiosError } from 'axios'
import { z, ZodError } from 'zod'
import { storeError } from '../helpers'

vi.mock('@/lib/bus', () => ({ bus: { emit: vi.fn() } }))

describe('storeError', () => {
  it('falls back to fallbackMessage when axios error has no response (network failure)', () => {
    const err = new AxiosError('Network Error')
    err.isAxiosError = true
    const result = storeError(err, 'fallback')
    expect(result.success).toBe(false)
    expect(result.message).toBe('fallback')
    expect(result.status).toBe(500)
    expect(result.fieldErrors).toEqual({})
  })

  it('uses message from axios response data when present', () => {
    const err = new AxiosError('boom')
    err.isAxiosError = true
    err.response = {
      status: 400,
      data: { message: 'Bad request', fieldErrors: { name: ['required'] } },
    } as any
    const result = storeError(err)
    expect(result.message).toBe('Bad request')
    expect(result.status).toBe(400)
    expect(result.fieldErrors).toEqual({ name: ['required'] })
  })

  it('handles ZodError', () => {
    let zerr: ZodError | undefined
    try {
      z.object({ name: z.string() }).parse({})
    } catch (e) {
      zerr = e as ZodError
    }
    expect(zerr).toBeInstanceOf(ZodError)
    const result = storeError(zerr!)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Validation failed')
  })

  it('handles plain Error', () => {
    const result = storeError(new Error('oops'))
    expect(result.message).toBe('oops')
  })
})
