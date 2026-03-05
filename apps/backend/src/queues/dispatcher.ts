import { emailQueue } from './emailQueue'

export class Dispatcher {
  async sendEmail(
    to: string,
    subject: string,
    publicName: string,
    callToActionLabel: string,
    callToActionUrl: string,
    contentBody: string
  ) {
    await emailQueue.add(
      'sendEmail',
      { to, subject, publicName, callToActionLabel, callToActionUrl, contentBody },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }
}

export const dispatcher = new Dispatcher()
