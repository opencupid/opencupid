import { FastifyReply, FastifyRequest } from 'fastify'
import { ZodSchema, ZodTypeAny, z } from 'zod'

export function validateBody<T>(
  schema: ZodTypeAny,
  req: FastifyRequest,
  reply: FastifyReply
): T | null {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    reply.status(400).send({ error: result.error.flatten() })
    return null
  }
  return result.data
}

export async function asyncValidateBody<T>(
  schema: ZodSchema<T>,
  req: FastifyRequest,
  reply: FastifyReply
): Promise<T | undefined> {
  const result = await schema.safeParseAsync(req.body)
  if (!result.success) {
    const { fieldErrors, formErrors } = result.error.flatten()
    reply.status(400).send({ fieldErrors, formErrors })
    return
  }
  return result.data
}
