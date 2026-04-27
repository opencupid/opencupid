import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { VersionSchema, type VersionDTO } from '@zod/dto/version.dto'
import type { ApiError } from '@shared/zod/apiResponse.dto'
import { rateLimitConfig, sendError } from '../helpers'

import { appConfig } from '@/lib/appconfig'

/*
$ curl -s http://localhost:8086/185.65.134.195|jq
{
  "country": "NL",
  "stateprov": "North Holland",
  "stateprovCode": "NH",
  "city": "Amsterdam",
  "latitude": "52.3385",
  "longitude": "4.9168",
  "continent": "EU",
  "timezone": "Europe/Amsterdam",
  "accuracyRadius": 20,
  "asn": 39351,
  "asnOrganization": "31173 Services AB",
  "asnNetwork": "185.65.132.0/22"
}

*/
// observabilitystack/geoip-api returns latitude/longitude as strings
// (e.g. "52.3385"). Coerce them to numbers and remap to lat/lon so the
// output shape matches LocationDTO.
const GeoipApiResponseSchema = z
  .object({
    country: z.string().min(2).max(2).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  })
  .transform(({ country, latitude, longitude }) => ({
    country,
    lat: latitude,
    lon: longitude,
  }))

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
   * observabilitystack/geoip-api service running at appConfig.GEOIP_API_URL.
   * @returns {{ success, location: LocationDTO }} { country, cityName }
   */
  fastify.get(
    '/location',
    {
      onRequest: [fastify.authenticate],
      config: {
        ...rateLimitConfig(fastify, '1 minute', 15),
      },
    },
    async (req, reply) => {
      const rawHeader = req.headers['x-forwarded-for'] as string | undefined
      let clientIp = extractClientIp(rawHeader, req.ip)

      if (appConfig.NODE_ENV === 'development') {
        clientIp = '188.6.25.123'
      }

      try {
        const res = await fetch(`${appConfig.GEOIP_API_URL}/${encodeURIComponent(clientIp)}`)

        if (res.status === 400) {
          return sendError(reply, 422, 'Invalid IP address')
        }

        if (res.status === 404) {
          return sendError(reply, 422, 'IP not found')
        }

        if (!res.ok) {
          fastify.log.warn({ status: res.status }, 'geoip-api returned non-2xx')
          return sendError(reply, 502, 'Geolocation upstream error')
        }

        const body = await res.json()
        const parsed = GeoipApiResponseSchema.safeParse(body)
        if (!parsed.success) {
          fastify.log.warn({ err: parsed.error, body }, 'geoip-api response shape unexpected')
          return sendError(reply, 502, 'Geolocation upstream returned malformed data')
        }

        return reply.code(200).send({ success: true, location: parsed.data })
      } catch (err) {
        fastify.log.warn(err)
        return sendError(reply, 500, 'Location lookup failed')
      }
    }
  )
}

export default appRoutes
