import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import i18next from 'i18next'
import { dispatcher } from '@/queues/dispatcher'
import type { NotifiableUser, EmailPayload } from './email/types'

export type NotificationType = 'login_link' | 'welcome' | 'new_message' | 'new_like' | 'new_match'

export interface NotificationTemplates {
  login_link: { otp: string; link: string }
  welcome: { link: string }
  new_message: { sender: string; message: string; link: string }
  new_like: { link: string }
  new_match: { name: string; link: string }
}

export class NotifierService {
  private static instance: NotifierService

  public static getInstance(): NotifierService {
    if (!NotifierService.instance) {
      NotifierService.instance = new NotifierService()
    }
    return NotifierService.instance
  }

  constructor(private disp = dispatcher) {}

  private templateName(type: NotificationType): string {
    switch (type) {
      case 'login_link':
        return 'loginLink'
      case 'welcome':
        return 'welcome'
      case 'new_message':
        return 'new_message'
      case 'new_like':
        return 'new_like'
      case 'new_match':
        return 'new_match'
    }
  }

  /**
   * Notify a user by their profile identifier.
   * Use this only when profile existence is already guaranteed by the caller's flow.
   */

  async notifyProfile<T extends NotificationType>(
    profileId: string,
    type: T,
    args: NotificationTemplates[T]
  ): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          include: {
            profile: {
              select: {
                publicName: true,
              },
            },
          },
        },
      },
    })
    if (!profile?.user) return
    await this.notifyResolvedUser(profile.user as NotifiableUser, type, args)
  }

  /**
   * Notify a user by their user identifier.
   * Use this for user-level notifications regardless of profile existence.
   */
  async notifyUser<T extends NotificationType>(
    userId: string,
    type: T,
    args: NotificationTemplates[T]
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            publicName: true,
          },
        },
      },
    })
    await this.notifyResolvedUser(user as NotifiableUser | null, type, args)
  }

  private createEmailPayload<T extends NotificationType>(
    type: T,
    args: NotificationTemplates[T],
    language: string | null
  ): EmailPayload {
    const t = i18next.getFixedT(language || 'en')
    const siteName = appConfig.SITE_NAME
    const tmpl = this.templateName(type)
    const subject = t(`emails.${tmpl}.subject`, { siteName, ...(args as any) }) as string
    const contentBody = t(`emails.${tmpl}.contentBody`, { siteName, ...(args as any) }) as string
    const footer = (t(`emails.${tmpl}.footer`) as string) || ''
    const callToActionLabel = t(`emails.${tmpl}.callToActionLabel`, {
      siteName,
      ...(args as any),
    }) as string
    const callToActionUrl = ((args as any).link || appConfig.FRONTEND_URL) as string

    return {
      subject,
      contentBody,
      footer,
      callToActionLabel,
      callToActionUrl,
    }
  }

  private async notifyResolvedUser<T extends NotificationType>(
    user: NotifiableUser | null,
    type: T,
    args: NotificationTemplates[T]
  ): Promise<void> {
    if (!user || !user.email) return

    const siteName = appConfig.SITE_NAME
    const emailPayload = this.createEmailPayload(type, args, user.language)
    const publicName = user.profile?.publicName || 'there'

    // TODO - refactor - introduce a shared type for the email payload
    // see apps/backend/src/queues/dispatcher.ts
    await this.disp.queueEmail(
      user.email,
      emailPayload.subject,
      publicName,
      emailPayload.callToActionLabel,
      emailPayload.callToActionUrl,
      emailPayload.contentBody,
      siteName,
      emailPayload.footer
    )
  }
}

export const notifierService = NotifierService.getInstance()
