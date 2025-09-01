import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { NewsletterSyncService } from '@/services/newsletterSync.service'
import { sendError } from '../helpers'
import { validateBody } from '@/utils/zodValidate'
import {
  NewsletterActionSchema,
  NewsletterActionResponseSchema,
  NewsletterSubscriptionResponseSchema,
  ListmonkWebhookEventSchema,
  type NewsletterAction,
  type NewsletterActionResponse,
  type NewsletterSubscriptionResponse,
  type ListmonkWebhookEvent,
} from '@zod/newsletter/newsletter.dto'

const newsletterRoutes: FastifyPluginAsync = async (fastify) => {
  const newsletterService = NewsletterSyncService.getInstance()
  newsletterService.setFastifyInstance(fastify)

  // GET /api/newsletter/me - Get current user's newsletter subscription
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const profileId = req.session.profileId
      if (!profileId) {
        return sendError(reply, 404, 'Profile not found')
      }

      const subscription = await newsletterService.getNewsletterSubscription(profileId)
      
      if (!subscription) {
        // Return default subscription state for users without newsletter records
        const response: NewsletterSubscriptionResponse = {
          id: '',
          status: 'SUBSCRIBED', // Default for existing users
          subscribedAt: null,
          unsubscribedAt: null,
          source: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        return reply.code(200).send(response)
      }

      const response = NewsletterSubscriptionResponseSchema.parse(subscription)
      return reply.code(200).send(response)
    } catch (error) {
      fastify.log.error('Error getting newsletter subscription:', error)
      return sendError(reply, 500, 'Failed to get newsletter subscription')
    }
  })

  // POST /api/newsletter/me - Update newsletter subscription
  fastify.post('/me', {
    preHandler: [fastify.authenticate],
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const profileId = req.session.profileId
      if (!profileId) {
        return sendError(reply, 404, 'Profile not found')
      }

      const data = await validateBody(NewsletterActionSchema, req, reply) as NewsletterAction
      if (!data) return

      const newStatus = await newsletterService.updateSubscriptionStatus(profileId, data.action)

      const response: NewsletterActionResponse = {
        success: true,
        status: newStatus,
        message: data.action === 'subscribe' ? 'Successfully subscribed to newsletter' : 'Successfully unsubscribed from newsletter',
      }

      return reply.code(200).send(NewsletterActionResponseSchema.parse(response))
    } catch (error) {
      fastify.log.error('Error updating newsletter subscription:', error)
      return sendError(reply, 500, 'Failed to update newsletter subscription')
    }
  })
}

// Webhook routes (separate from main API)
export const newsletterWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  const newsletterService = NewsletterSyncService.getInstance()
  newsletterService.setFastifyInstance(fastify)

  // POST /webhooks/listmonk - Handle Listmonk webhooks
  fastify.post('/listmonk', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const event = ListmonkWebhookEventSchema.safeParse(req.body)
      if (!event.success) {
        fastify.log.warn('Invalid webhook payload:', event.error)
        return reply.code(400).send({ error: 'Invalid webhook payload' })
      }

      await newsletterService.handleListmonkWebhook(event.data)
      return reply.code(204).send()
    } catch (error) {
      fastify.log.error('Error handling Listmonk webhook:', error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}

export default newsletterRoutes