import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import i18next from 'i18next'
import { dispatcher } from '@/queues/emailDispatcher'
import type { EmailPayload } from './email/types'

type NotificationType = 'login_link' | 'welcome' | 'new_message' | 'new_like' | 'new_match'

type NotifiableUser = {
  id: string
  email: string
  language: string
  profile?: { publicName: string }
}

interface NotificationParams {
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
    args: NotificationParams[T]
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
    emailType: T,
    args: NotificationParams[T]
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })
    if (!user) return
    await this.notifyResolvedUser(user as NotifiableUser, emailType, args)
  }

  private createEmailPayload<T extends NotificationType>(
    emailType: T,
    args: NotificationParams[T],
    user: NotifiableUser
  ): EmailPayload {
    const siteName = appConfig.SITE_NAME
    const t = i18next.getFixedT(user.language)
    const tmpl = this.templateName(emailType)

    return {
      to: user.email,
      subject: t(`emails.${tmpl}.subject`, { siteName }),
      templateProps: {
        siteName,
        publicName: user.profile?.publicName || '',
        contentBody: t(`emails.${tmpl}.contentBody`, { siteName, ...args, ...user }),
        callToActionLabel: t(`emails.${tmpl}.callToActionLabel`),
        callToActionUrl: args.link,
        footer: t(`emails.${tmpl}.footer`, { defaultValue: '' }),
      },
    }
  }

  private async notifyResolvedUser<T extends NotificationType>(
    user: NotifiableUser,
    emailType: T,
    args: NotificationParams[T]
  ): Promise<void> {
    if (!user || !user.email) return

    const emailPayload = this.createEmailPayload(emailType, args, user)

    await this.disp.dispatchEmail(emailPayload)
  }
}

export const notifierService = NotifierService.getInstance()
