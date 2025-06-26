import { FastifyPluginAsync } from 'fastify'
import { WebServiceClient } from '@maxmind/geoip2-node'
import { appConfig } from '@/lib/appconfig'
import { LocationSchema, type LocationDTO } from '@zod/dto/location.dto'
import type { ApiError } from '@shared/zod/apiResponse.dto'

const appRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/location', async (req, reply) => {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip

    try {
      const client = new WebServiceClient(
        appConfig.MAXMIND_ACCOUNT_ID,
        appConfig.MAXMIND_LICENSE_KEY,
        { host: 'geolite.info' }
      )
      const result = await client.city(ip)
      const location: LocationDTO = {
        country: result.country?.isoCode ?? '',
        cityId: null,
        cityName: result.city?.names?.en ?? ''
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
