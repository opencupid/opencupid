import { prisma } from '@/lib/prisma'
import { Prisma, NewsletterStatus } from '@prisma/client'
import { FastifyInstance } from 'fastify'

export class NewsletterSyncService {
  private static instance: NewsletterSyncService
  private fastify: FastifyInstance | null = null

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): NewsletterSyncService {
    if (!NewsletterSyncService.instance) {
      NewsletterSyncService.instance = new NewsletterSyncService()
    }
    return NewsletterSyncService.instance
  }

  public setFastifyInstance(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  /**
   * Sync a profile to Listmonk by creating/updating subscriber and ensuring list membership
   */
  async syncProfileToListmonk(profileId: string): Promise<void> {
    if (!this.fastify?.listmonkConfig?.enabled) {
      return // Newsletter functionality disabled
    }

    try {
      // Get profile with user email and newsletter subscription
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: {
          user: {
            select: { email: true }
          },
          newsletter: true,
        },
      })

      if (!profile || !profile.user?.email) {
        throw new Error(`Profile ${profileId} not found or has no email`)
      }

      // Get or create newsletter subscription record
      let newsletter = profile.newsletter
      if (!newsletter) {
        newsletter = await prisma.newsletterSubscription.create({
          data: {
            profileId: profile.id,
            status: NewsletterStatus.SUBSCRIBED,
            source: 'profile_sync',
            subscribedAt: new Date(),
          },
        })
      }

      // Sync to Listmonk if enabled
      if (this.fastify.listmonk) {
        const attributes = {
          profileId: profile.id,
          createdAt: profile.createdAt.toISOString(),
          languages: profile.languages,
        }

        // Upsert subscriber in Listmonk
        const { id: listmonkId, uuid: listmonkUUID } = await this.fastify.listmonk.upsertSubscriber(
          profile.user.email,
          profile.publicName,
          attributes
        )

        // Update our record with Listmonk IDs
        await prisma.newsletterSubscription.update({
          where: { id: newsletter.id },
          data: {
            listmonkId,
            listmonkUUID,
          },
        })

        // Ensure subscription to default list if user is subscribed
        if (newsletter.status === NewsletterStatus.SUBSCRIBED) {
          await this.fastify.listmonk.subscribeToList(listmonkId, this.fastify.listmonkConfig.listId)
        }

        this.fastify.log.info(`Synced profile ${profileId} to Listmonk subscriber ${listmonkId}`)
      }
    } catch (error) {
      this.fastify?.log.error(`Failed to sync profile ${profileId} to Listmonk:`, error)
      throw error
    }
  }

  /**
   * Handle webhook events from Listmonk (unsubscribe, bounce, complaint)
   */
  async handleListmonkWebhook(event: {
    type: 'unsubscribe' | 'bounce' | 'complaint'
    subscriber: { id: number; uuid: string; email: string }
    timestamp: string
  }): Promise<void> {
    try {
      // Find newsletter subscription by listmonkId or listmonkUUID
      const newsletter = await prisma.newsletterSubscription.findFirst({
        where: {
          OR: [
            { listmonkId: event.subscriber.id },
            { listmonkUUID: event.subscriber.uuid },
          ],
        },
      })

      if (!newsletter) {
        this.fastify?.log.warn(`Newsletter subscription not found for Listmonk subscriber ${event.subscriber.id}`)
        return
      }

      // Update status based on event type
      let status: NewsletterStatus
      let updateData: Prisma.NewsletterSubscriptionUpdateInput = {}

      switch (event.type) {
        case 'unsubscribe':
          status = NewsletterStatus.UNSUBSCRIBED
          updateData.unsubscribedAt = new Date(event.timestamp)
          break
        case 'bounce':
          status = NewsletterStatus.BOUNCED
          break
        case 'complaint':
          status = NewsletterStatus.COMPLAINED
          break
        default:
          this.fastify?.log.warn(`Unknown webhook event type: ${event.type}`)
          return
      }

      updateData.status = status

      await prisma.newsletterSubscription.update({
        where: { id: newsletter.id },
        data: updateData,
      })

      this.fastify?.log.info(`Updated newsletter subscription ${newsletter.id} status to ${status} from webhook`)
    } catch (error) {
      this.fastify?.log.error('Failed to handle Listmonk webhook:', error)
      throw error
    }
  }

  /**
   * Update newsletter subscription status and sync to Listmonk
   */
  async updateSubscriptionStatus(
    profileId: string,
    action: 'subscribe' | 'unsubscribe'
  ): Promise<NewsletterStatus> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: {
          user: { select: { email: true } },
          newsletter: true,
        },
      })

      if (!profile) {
        throw new Error(`Profile ${profileId} not found`)
      }

      const newStatus = action === 'subscribe' ? NewsletterStatus.SUBSCRIBED : NewsletterStatus.UNSUBSCRIBED
      const now = new Date()

      // Update or create newsletter subscription
      const newsletter = await prisma.newsletterSubscription.upsert({
        where: { profileId },
        update: {
          status: newStatus,
          ...(action === 'subscribe' ? { subscribedAt: now } : { unsubscribedAt: now }),
        },
        create: {
          profileId,
          status: newStatus,
          source: 'user_preference',
          ...(action === 'subscribe' ? { subscribedAt: now } : { unsubscribedAt: now }),
        },
      })

      // Sync to Listmonk if enabled and we have the subscriber info
      if (this.fastify?.listmonk && newsletter.listmonkId) {
        if (action === 'subscribe') {
          await this.fastify.listmonk.subscribeToList(newsletter.listmonkId, this.fastify.listmonkConfig.listId)
        } else {
          await this.fastify.listmonk.unsubscribeFromList(newsletter.listmonkId, this.fastify.listmonkConfig.listId)
        }
      } else if (this.fastify?.listmonk && profile.user?.email) {
        // If we don't have listmonkId, sync the whole profile to get it
        await this.syncProfileToListmonk(profileId)
      }

      return newStatus
    } catch (error) {
      this.fastify?.log.error(`Failed to update subscription status for profile ${profileId}:`, error)
      throw error
    }
  }

  /**
   * Get newsletter subscription for a profile
   */
  async getNewsletterSubscription(profileId: string) {
    return await prisma.newsletterSubscription.findUnique({
      where: { profileId },
    })
  }
}