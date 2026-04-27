import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { ApiError } from '@shared/zod/apiResponse.dto'
import { rateLimitConfig } from '../helpers'

const GEOIP_API_URL = 'http://geoip-api:8080'

const GeoipApiResponseSchema = z.object({
  country: z.string().min(2).max(2).optional(),
})

function extractClientIp(headerValue: string | undefined, fallbackIp: string): string {
  const rawIp = headerValue?.split(',')[0].trim() ?? fallbackIp
  // common prefix for IPv4-mapped IPv6 addresses (RFC 4291), remove
  return rawIp.startsWith('::ffff:') ? rawIp.substring(7) : rawIp
}

const appRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /version
   * Returns backend and frontend version info. If the client sends its current version,
   * includes an updateAvailable flag.
   * @query {string} [v] - Client's current frontend version
   * @returns {{ success, version: VersionDTO }}
   */
  fastify.get(
    '/version',
    {
      config: { ...rateLimitConfig(fastify, '1 minute', 20) },
    },
    async (req, reply) => {
      try {
        const clientVersion = (req.query as Record<string, string>).v as string | undefined
        const frontendVersion = __FRONTEND_VERSION__

        const versionInfo: VersionDTO = {
          frontendVersion,
          backendVersion: __APP_VERSION__,
          updateAvailable:
            clientVersion !== undefined &&
            clientVersion !== 'unknown' &&
            frontendVersion !== 'unknown' &&
            clientVersion !== frontendVersion,
          ...(clientVersion !== undefined ? { currentVersion: clientVersion } : {}),
        }

        const payload = VersionSchema.parse(versionInfo)
        return reply.code(200).send({ success: true, version: payload })
      } catch (err) {
        fastify.log.error(err)
        const out: ApiError = { success: false, message: 'Failed to read version info' }
        return reply.code(500).send(out)
      }
    }
  )

  /**
   * GET /location
   * Returns the client's country based on IP geolocation, looked up via the
   * observabilitystack/geoip-api service running at GEOIP_API_URL.
   * @returns {{ success, location: LocationDTO }} { country, cityName }
   */
  fastify.get(
    '/location',
    {
      config: {
        ...rateLimitConfig(fastify, '5 minute', 5),
      },
    },
    async (req, reply) => {
      const rawHeader = req.headers['x-forwarded-for'] as string | undefined
      const clientIp = extractClientIp(rawHeader, req.ip)

      try {
        const res = await fetch(`${GEOIP_API_URL}/${encodeURIComponent(clientIp)}`)
        if (!res.ok) {
          throw new Error(`geoip-api returned ${res.status}`)
        }
        const parsed = GeoipApiResponseSchema.parse(await res.json())
        const location: LocationDTO = {
          country: parsed.country ?? '',
          cityName: '',
        }
        const payload = LocationSchema.parse(location)
        return reply.code(200).send({ success: true, location: payload })
      } catch (err) {
        fastify.log.error(err)
        const out: ApiError = { success: false, message: 'Location lookup failed' }
        return reply.code(500).send(out)
      }
    }
  )
}

export default appRoutes
