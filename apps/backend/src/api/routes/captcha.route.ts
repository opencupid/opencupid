import { FastifyPluginAsync } from 'fastify'
import { createChallenge } from 'altcha-lib'
import { sendError } from '../helpers'
import { appConfig } from '@/lib/appconfig'
import type { CaptchaChallengeResponse } from '@zod/apiResponse.dto'

const captchaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/challenge', async (request, reply) => {
    try {
      const challenge = await createChallenge({
        hmacKey: appConfig.ALTCHA_HMAC_KEY,
        maxNumber: 50_000,
      })
      const response: CaptchaChallengeResponse = challenge
      return reply.code(200).send(response)
    } catch (error: any) {
      return sendError(reply, 500, 'Failed to create challenge')
    }
  })

  // // POST /submit
  // fastify.post('/submit', async (request, reply) => {
  //   try {
  //     const parts = await request.parts()
  //     const formData = new Map<string, string>()

  //     for await (const part of parts) {
  //       if (part.type === 'file') continue
  //       formData.set(part.fieldname, part.value)
  //     }

  //     const altcha = formData.get('altcha')
  //     if (!altcha) {
  //       return reply.status(400).send({ error: 'Altcha payload missing' })
  //     }

  //     const verified = await verifySolution(String(altcha), ALTCHA_HMAC_KEY)
  //     if (!verified) {
  //       return reply.status(400).send({ error: 'Invalid Altcha payload' })
  //     }

  //     return reply.send({
  //       success: true,
  //       data: Object.fromEntries(formData),
  //     })
  //   } catch (error: any) {
  //     return reply.status(500).send({
  //       error: 'Failed to process submission',
  //       details: error.message,
  //     })
  //   }
  // })

  // // POST /submit_spam_filter
  // fastify.post('/submit_spam_filter', async (request, reply) => {
  //   try {
  //     const parts = await request.parts()
  //     const formData = new Map<string, string>()

  //     for await (const part of parts) {
  //       if (part.type === 'file') continue
  //       formData.set(part.fieldname, part.value)
  //     }

  //     const altcha = formData.get('altcha')
  //     if (!altcha) {
  //       return reply.status(400).send({ error: 'Altcha payload missing' })
  //     }

  //     const { verificationData, verified } = await verifyServerSignature(String(altcha), ALTCHA_HMAC_KEY)

  //     if (!verified || !verificationData) {
  //       return reply.status(400).send({ error: 'Invalid Altcha payload' })
  //     }

  //     const { classification, fields, fieldsHash } = verificationData

  //     if (classification === 'BAD') {
  //       return reply.status(400).send({ error: 'Classified as spam' })
  //     } else if (fields && fieldsHash && !(await verifyFieldsHash(formData, fields, fieldsHash))) {
  //       return reply.status(400).send({ error: 'Invalid fields hash' })
  //     }

  //     return reply.send({
  //       success: true,
  //       data: Object.fromEntries(formData),
  //       verificationData,
  //     })
  //   } catch (error: any) {
  //     return reply.status(500).send({
  //       error: 'Failed to process submission with spam filter',
  //       details: error.message,
  //     })
  //   }
  // })
}

export default captchaRoutes
