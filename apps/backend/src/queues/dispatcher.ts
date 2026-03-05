import { emailQueue } from './emailQueue'

// TODO refactor - extract queueEmail signature into a shared type.
// implement a generalized type (Zod schema) to be used across the email queue/rendering
// code, using slightly different shape. Use 
// related code:
// apps/backend/src/services/email/emailSender.service.ts
// apps/backend/src/services/notifier.service.ts
export class Dispatcher {
  async queueEmail(
    to: string,
    subject: string,
    publicName: string,
    callToActionLabel: string,
    callToActionUrl: string,
    contentBody: string,
    siteName: string,
    footer: string
  ) {
    await emailQueue.add(
      'sendEmail',
      {
        to,
        subject,
        publicName,
        callToActionLabel,
        callToActionUrl,
        contentBody,
        siteName,
        footer,
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
    )
    console.warn(`Queued email to ${to} with subject "${subject}"`)
  }
}

export const dispatcher = new Dispatcher()
