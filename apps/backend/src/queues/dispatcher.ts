import { emailQueue } from './emailQueue'

export class Dispatcher {
  async sendEmail(to: string, subject: string, html: string) {
    await emailQueue.add(
      'sendEmail',
      { to, subject, html },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }
}

export const dispatcher = new Dispatcher()
