// src/plugins/apiRecorder.ts
import fp from 'fastify-plugin'
import { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs/promises'
import path from 'path'

export type RecordedRequest = {
  method: string
  url: string
  query: any
  body: any
  headers: Record<string, string>
  response: any
  status: number
  timestamp: string
}

export const LOG_DIR = path.join(process.cwd(), 'src/__tests__/fixtures/apiRecorder')
export default fp(async function apiRecorder(fastify) {

  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload: any) => {
    setImmediate(async () => {
      try {
        const record: RecordedRequest = {
          method: req.method,
          url: req.url,
          query: req.query,
          body: req.body,
          headers: {
            ...req.headers,
            authorization: undefined,
            cookie: undefined,
          },
          response: safeJson(payload),
          status: reply.statusCode,
          timestamp: new Date().toISOString(),
        }

        await fs.mkdir(LOG_DIR, { recursive: true })
        const filename = `${req.method}_${req.url.replace(/\W+/g, '_')}_${Date.now()}.json`
        const json = JSON.stringify(record, null, 2)
        await fs.writeFile(path.join(LOG_DIR, filename), json)
      } catch (err) {
        fastify.log.warn('Failed to write API log:', err)
      }
    })
  })
})

function safeJson(payload: any): any {
  try {
    if (typeof payload === 'string') {
      return JSON.parse(payload)
    }
    if (typeof payload === 'object') {
      return payload
    }
    return { raw: String(payload) }
  } catch {
    return { raw: payload }
  }
}



