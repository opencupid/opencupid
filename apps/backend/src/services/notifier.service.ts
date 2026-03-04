import { prisma } from '@/lib/prisma'
import { appConfig } from '@/lib/appconfig'
import i18next from 'i18next'
import { dispatcher } from '@/queues/dispatcher'

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

  async notifyUser<T extends NotificationType>(
    userId: string,
    type: T,
    args: NotificationTemplates[T]
  ): Promise<void> {

    // TODO - we need to be able to access Profile.publicName as well as User.email and User.language here
    // Introduce an EmailRecipient Zod type that includes all the info we need to send an email, 
    // and use that instead of just userId.
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.email) return

    // TODO - tighten the Prisma schema (so that User.language is non-nullable (make sure it's set at user registration), 
    // then remove the fallback here.
    // This is a large refactoring affecting a lot of code - this is out of scope for the HTML email
    // implementation.
    const t = i18next.getFixedT(user.language || 'en')
    const siteName = appConfig.SITE_NAME 
    const tmpl = this.templateName(type)
    const subject = t(`emails.${tmpl}.subject`, { siteName, ...(args as any) }) as string
    const html = t(`emails.${tmpl}.html`, { siteName, ...(args as any) }) as string

    await this.disp.sendEmail(user.email, subject, html)
  }

  async notifyProfile<T extends NotificationType>(
    profileId: string,
    type: T,
    args: NotificationTemplates[T]
  ): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { user: true },
    })
    if (!profile?.user) return
    await this.notifyUser(profile.user.id, type, args)
  }
}

export const notifierService = NotifierService.getInstance()
