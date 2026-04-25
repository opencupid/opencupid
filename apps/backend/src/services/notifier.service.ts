import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'
import i18next from 'i18next'
import { currentBrand, type Brand } from '@/lib/brand'
import { dispatcher } from '@/queues/emailDispatcher'
import type { EmailPayload } from './email/types'
import { hashEmail, signUnsubscribeToken } from './email/unsubscribeToken'

type NotificationType =
  | 'login_link'
  | 'welcome'
  | 'new_message'
  | 'new_like'
  | 'new_match'
  | 'onboarding_reminder'

// login_link is auth/transactional — always sent and never carries an
// unsubscribe link or List-Unsubscribe header. Every other type is a
// suppressible notification subject to emailNotificationsOptIn.
const SUPPRESSIBLE_TYPES: ReadonlySet<NotificationType> = new Set([
  'welcome',
  'new_message',
  'new_like',
  'new_match',
  'onboarding_reminder',
])

type NotifiableUser = User & { profile?: { publicName: string } | null }

interface NotificationParams {
  login_link: { link: string }
  welcome: { link: string }
  /** senderId is used by constructDispatchKey to scope dedup per sender→recipient pair. */
  new_message: { senderId: string; sender: string; message: string; link: string }
  new_like: { link: string }
  new_match: { name: string; link: string }
  onboarding_reminder: { link: string }
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

  /**
   * Build a dispatch key that controls deduplication behavior per notification type.
   *
   * - Idempotent (welcome, onboarding_reminder): deterministic per user — safe to retry.
   * - Throttled (new_message): deterministic per sender→recipient pair — one email per
   *   conversation partner within the removeOnComplete retention window.
   * - Event-driven (everything else): timestamped — every event produces its own job.
   */
  private constructDispatchKey<T extends NotificationType>(
    emailType: T,
    args: NotificationParams[T],
    user: NotifiableUser
  ): string {
    switch (emailType) {
      case 'welcome':
      case 'onboarding_reminder':
        return `${emailType}-${user.id}`
      case 'new_message': {
        const { senderId } = args as NotificationParams['new_message']
        return `${emailType}-${senderId}-${user.id}`
      }
      default:
        return `${emailType}-${user.id}-${Date.now()}`
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
    await this.notifyResolvedUser(profile.user, type, args)
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
    await this.notifyResolvedUser(user, emailType, args)
  }

  private createEmailPayload<T extends NotificationType>(
    emailType: T,
    args: NotificationParams[T],
    user: NotifiableUser
  ): EmailPayload {
    const brand = currentBrand()
    const { siteName } = brand
    const t = i18next.getFixedT(user.language)

    const suppressible = SUPPRESSIBLE_TYPES.has(emailType)
    const unsubscribe = suppressible ? this.buildUnsubscribe(brand, user, t) : undefined

    // emailType maps 1:1 to the i18n key under `emails.*` (e.g. emails.new_message.subject).
    return {
      to: user.email,
      subject: t(`emails.${emailType}.subject`, { siteName }),
      brand,
      templateProps: {
        siteName,
        publicName: user.profile?.publicName || '',
        contentBody: t(`emails.${emailType}.contentBody`, { siteName, ...args, ...user }),
        callToActionLabel: t(`emails.${emailType}.callToActionLabel`),
        callToActionUrl: args.link,
        fallbackHint: t(`emails.fallback_hint`),
        footer: t(`emails.${emailType}.footer`, { defaultValue: '' }),
        unsubscribeUrl: unsubscribe?.url,
        unsubscribeLabel: unsubscribe?.label,
      },
      headers: unsubscribe
        ? {
            'List-Unsubscribe': `<${unsubscribe.url}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined,
    }
  }

  private buildUnsubscribe(
    brand: Brand,
    user: NotifiableUser,
    t: ReturnType<typeof i18next.getFixedT>
  ): { url: string; label: string } {
    const token = signUnsubscribeToken({
      userId: user.id,
      emailHash: hashEmail(user.email),
    })
    return {
      url: `${brand.frontendUrl}/unsubscribe/${token}`,
      label: t('emails.unsubscribe_link', { defaultValue: 'Unsubscribe from these emails' }),
    }
  }

  private async notifyResolvedUser<T extends NotificationType>(
    user: NotifiableUser,
    emailType: T,
    args: NotificationParams[T]
  ): Promise<void> {
    if (SUPPRESSIBLE_TYPES.has(emailType) && user.emailNotificationsOptIn === false) return

    const emailPayload = this.createEmailPayload(emailType, args, user)
    await this.disp.dispatchEmail(emailPayload, this.constructDispatchKey(emailType, args, user))
  }
}

export const notifierService = NotifierService.getInstance()
