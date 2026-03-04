import { emailQueue } from './emailQueue'

export class Dispatcher {
  async sendEmail(to: string, subject: string, html: string) {
    await emailQueue.add(
      'sendEmail',
      // TODO pull in the email template variables here instead of just passing html
      // rework the i18n strings loginLink, new_message, new_link etc to keep subject and contentBody
      // and pass those in the job data instead of pre-rendered html.
      { to, subject, html },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }
}

export const dispatcher = new Dispatcher()
