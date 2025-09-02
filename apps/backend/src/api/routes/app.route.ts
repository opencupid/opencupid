import { FastifyPluginAsync } from 'fastify'
import { WebServiceClient } from '@maxmind/geoip2-node'
import fs from 'fs'
import path from 'path'

import { appConfig } from '@/lib/appconfig'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { ApiError } from '@shared/zod/apiResponse.dto'
import { rateLimitConfig } from '../helpers'
import { getPackageVersion } from '../../../../../packages/shared/version'

function extractClientIp(headerValue: string | undefined, fallbackIp: string): string {
  const rawIp = headerValue?.split(',')[0].trim() ?? fallbackIp
  // common prefix for IPv4-mapped IPv6 addresses (RFC 4291), remove
  return rawIp.startsWith('::ffff:') ? rawIp.substring(7) : rawIp
}

const appRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/version', async (req, reply) => {
      try {
    const versionInfo = getPackageVersion(path.join(__dirname, '..', 'package.json'))
      
      return reply.code(200).send({ success: true, version: versionInfo })
    } catch (err) {
      fastify.log.error(err)
      const out: ApiError = { success: false, message: 'Failed to read version info' }
      return reply.code(500).send(out)
    }
  })

  fastify.get('/location', {
    onRequest: [fastify.authenticate],
    // rate limiter
    config: {
      ...rateLimitConfig(fastify, '5 minute', 5), 
    },
  }, async (req, reply) => {
    const rawHeader = req.headers['x-forwarded-for'] as string | undefined
    const clientIp = extractClientIp(rawHeader, req.ip)

    if (appConfig.NODE_ENV === 'development') {
      const location: LocationDTO = {
        country: 'MX',
        cityName: ''
      }
      const payload = LocationSchema.parse(location)
      return reply.code(200).send({ success: true, location: payload })
    }

    try {
      const client = new WebServiceClient(
        appConfig.MAXMIND_ACCOUNT_ID,
        appConfig.MAXMIND_LICENSE_KEY,
        { host: 'geolite.info' }
      )
      const result = await client.country(clientIp)
      const location: LocationDTO = {
        country: result.country?.isoCode ?? '',
        cityName: ''
      }
      const payload = LocationSchema.parse(location)
      return reply.code(200).send({ success: true, location: payload })
    } catch (err) {
      fastify.log.error(err)
      const out: ApiError = { success: false, message: 'Location lookup failed' }
      return reply.code(500).send(out)
    }
  })
}

export default appRoutes
