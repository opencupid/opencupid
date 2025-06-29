import { validateBody } from '@/utils/zodValidate'
import {
  PublicCitySchema,
  SearchQuerySchema,
  CityParamsSchema,
  CreateCityPayload,
  CreateCityPayloadSchema,
} from '@zod/dto/city.dto'
import { FastifyPluginAsync } from 'fastify'
import { sendError, addDebounceHeaders } from '../helpers'
import { CityService } from 'src/services/city.service'
import type { CityResponse, CitiesResponse } from '@zod/apiResponse.dto'



const citiesRoutes: FastifyPluginAsync = async fastify => {
  const cityService = CityService.getInstance()

  /**
 * Get a city by ID
 */
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = CityParamsSchema.parse(req.params);
    try {
      const city = await cityService.findById(id);
      if (!city) return sendError(reply, 404, 'City not found');
      return reply.code(200).send({ success: true, city });
    } catch (err) {
      fastify.log.error(err);
      return sendError(reply, 500, 'Failed to fetch city');
    }
  });


  /**
   * Search cities by partial name -- for type-ahead multi-select with debounce headers
   */
  fastify.get('/search', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { q, country } = SearchQuerySchema.parse(req.query)
    try {
      const cities = await cityService.search(country, q)
      addDebounceHeaders(reply)
      if (!cities || cities.length === 0) {
        const response: CitiesResponse = { success: true, cities: [] }
        return reply.code(200).send(response)
      }
      const publicCities = cities.map(city => PublicCitySchema.parse(city))
      const response: CitiesResponse = { success: true, cities: publicCities }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to search cities')
    }
  })

  /**
   * Create a new city
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      // rate limiter
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '10 minute',
          onExceeded: (req, key) => {
            fastify.log.warn(`Rate limit exceeded for user: ${key}`)
          },
        }
      },
    },
    async (req, reply) => {
      const userId = req.user.userId
      if (!userId) {
        return sendError(reply, 401, 'Unauthorized')
      }
      // validateBody has some typing issues
      const data: CreateCityPayload | null = validateBody(CreateCityPayloadSchema, req, reply)
      if (!data) return
      try {
        const created = await cityService.create({
          ...data,
          createdBy: userId, // Set the creator to the authenticated user
          isUserCreated: true, // Mark as user-created
        })
        const city = PublicCitySchema.parse(created)
        const response: CityResponse = { success: true, city }
        return reply.code(200).send(response)
      } catch (err: any) {
        fastify.log.error(err)
        if (err.code === 'P2025') {
          return sendError(reply, 404, 'City not found')
        }
        return sendError(reply, 500, 'Failed to create city')
      }
    }
  )

  /**
   * Admin endpoints
   * TODO add admin role checks
   */

  /**
   * List all cities
   */
  // fastify.get('/', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
  //   try {
  //     const cities = await cityService.findAll();
  //     return reply.code(200).send({ success: true, cities });
  //   } catch (err) {
  //     fastify.log.error(err);
  //     return sendError(reply, 500, 'Failed to list cities');
  //   }
  // });


  /**
   * Update a city
   */
  // fastify.patch('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
  //   const { id } = CityParamsSchema.parse(req.params);
  //   const data = await validateBody(UpdateCityPayloadSchema, req, reply)
  //   if (!data) return;
  //   try {
  //     const updated = await cityService.update(id, data);
  //     return reply.code(200).send({ success: true, city: updated });
  //   } catch (err: any) {
  //     fastify.log.error(err);
  //     if (err.code === 'P2025') {
  //       return sendError(reply, 404, 'City not found');
  //     }
  //     return sendError(reply, 500, 'Failed to update city');
  //   }
  // });

  /**
   * Soft delete a city
   */
  // fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
  //   const { id } = CityParamsSchema.parse(req.params);
  //   try {
  //     await cityService.remove(id);
  //     return reply.code(204).send();
  //   } catch (err) {
  //     fastify.log.error(err);
  //     return sendError(reply, 500, 'Failed to delete city');
  //   }
  // });
}

export default citiesRoutes
