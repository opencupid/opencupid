import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validateBody, asyncValidateBody } from '../../utils/zodValidate'

function mockReqReply(body: any) {
  const req = { body } as any
  const reply = {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    send(data: any) {
      this.payload = data
      return this
    },
  }
  return { req, reply: reply as any }
}

const TestSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
})

describe('validateBody', () => {
  it('returns parsed data on valid input', () => {
    const { req, reply } = mockReqReply({ name: 'Alice', age: 30 })
    const result = validateBody<{ name: string; age: number }>(TestSchema, req, reply)
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  it('returns null and sends 400 on invalid input', () => {
    const { req, reply } = mockReqReply({ name: 123 })
    const result = validateBody(TestSchema, req, reply)
    expect(result).toBeNull()
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.error).toBeDefined()
  })

  it('returns null on empty body', () => {
    const { req, reply } = mockReqReply(undefined)
    const result = validateBody(TestSchema, req, reply)
    expect(result).toBeNull()
    expect(reply.statusCode).toBe(400)
  })
})

describe('asyncValidateBody', () => {
  it('returns parsed data on valid input', async () => {
    const { req, reply } = mockReqReply({ name: 'Bob', age: 25 })
    const result = await asyncValidateBody(TestSchema, req, reply)
    expect(result).toEqual({ name: 'Bob', age: 25 })
  })

  it('returns undefined and sends 400 on invalid input', async () => {
    const { req, reply } = mockReqReply({ age: -1 })
    const result = await asyncValidateBody(TestSchema, req, reply)
    expect(result).toBeUndefined()
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.fieldErrors).toBeDefined()
  })
})
