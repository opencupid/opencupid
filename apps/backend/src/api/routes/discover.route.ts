import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { MatchQueryService } from '@/services/matchQuery.service'
import { ProfileService } from '@/services/profile.service'
import { sendError, sendForbiddenError } from '../helpers'
import { mapProfileToPublic, mapProfileWithContext } from '../mappers/profile.mappers'
import { GetProfilesResponse } from '@zod/apiResponse.dto'

const matcherRoutes: FastifyPluginAsync = async fastify => {

  // instantiate services
  const matchQueryService = MatchQueryService.getInstance()

 
  fastify.get('/social', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.session.hasActiveProfile) return sendForbiddenError(reply)
    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await matchQueryService.findSocialProfilesFor(locale, myProfileId)
      const hasDatingPermission = req.session.profile.isDatingActive
      const mappedProfiles = profiles.map(p => mapProfileToPublic(p, hasDatingPermission, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })


 fastify.get('/dating', { onRequest: [fastify.authenticate] }, async (req, reply) => {

    if (!req.session.hasActiveProfile) return sendForbiddenError(reply)
    const myProfileId = req.session.profileId
    const locale = req.session.lang

    try {
      const profiles = await matchQueryService.findMutualMatchesFor(locale, myProfileId)
      const hasDatingPermission = req.session.profile.isDatingActive
      const mappedProfiles = profiles.map(p => mapProfileToPublic(p, hasDatingPermission, locale))
      const response: GetProfilesResponse = { success: true, profiles: mappedProfiles }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch profiles')
    }
  })


}

export default matcherRoutes