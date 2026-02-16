import { prisma } from '@/lib/prisma'
import { MessageDTO } from '@zod/messaging/messaging.dto'

// pushService.ts
import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export class WebPushService {
  private static instance: WebPushService


  private constructor() { }

  public static isWebPushConfigured(): boolean {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  }

  public static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService()
    }
    return WebPushService.instance
  }

  async send(message: MessageDTO, recipientProfileId: string) {
    if (!WebPushService.isWebPushConfigured()) {
      throw new Error('Web push is not configured: VAPID keys are missing.')
    }

    const profile = await prisma.profile.findUnique({
      where: { id: recipientProfileId },
      include: { user: true },
    })
    if (!profile?.user) return
    if (!profile.user.isPushNotificationEnabled) return

    const payload = {
      title: `New message from ${message.sender.publicName}`,
      body: message.content?.substring(0, 100) || 'You got a message',
      data: {
        url: `/inbox/${message.conversationId}`,
      }
    }
    const subscriptions = await this.getSubscriptions(profile.user.id)

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        )
      } catch (err) {
        console.error('Push failed:', err)
      }
    }
  }

  async sendPushNotification(subscription: webpush.PushSubscription, payload: any) {
    if (!WebPushService.isWebPushConfigured()) {
      throw new Error('Web push is not configured: VAPID keys are missing.')
    }
    return await webpush.sendNotification(subscription, JSON.stringify(payload))
  }


  async getSubscriptions(userId?: string) {
    return await prisma.pushSubscription.findMany({
      where: userId ? { userId } : undefined,
    })
  }

}