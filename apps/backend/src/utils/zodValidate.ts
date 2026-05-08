import { FastifyReply, FastifyRequest } from 'fastify'
import { z, type ZodType } from 'zod'

export function validateBody<T>(
  schema: ZodType<T, unknown>,
  req: FastifyRequest,
  reply: FastifyReply
): T | null {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    reply.status(400).send({ error: z.flattenError(result.error) })
    return null
  }
  return result.data
}

export async function asyncValidateBody<T>(
  schema: ZodType<T, unknown>,
  req: FastifyRequest,
  reply: FastifyReply
): Promise<T | undefined> {
  const result = await schema.safeParseAsync(req.body)
  if (!result.success) {
    const { fieldErrors, formErrors } = z.flattenError(result.error)
    reply.status(400).send({ fieldErrors, formErrors })
    return
  }
  return result.data
}
