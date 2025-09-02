import * as nodemailer from 'nodemailer'
import { appConfig } from '@/lib/appconfig'
import type { EmailProvider, TxPayload } from '@/types/email.types'

export class DirectSMTPEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: appConfig.SMTP_HOST,
      port: Number(appConfig.SMTP_PORT),
      secure: false,
      auth: {
        user: appConfig.SMTP_USER,
        pass: appConfig.SMTP_PASS,
      },
    })
  }

  async sendTransactional(payload: TxPayload): Promise<void> {
    // For SMTP fallback, we need to convert TxPayload to individual email sends
    // since SMTP doesn't support templates. We'll assume the caller provides
    // rendered content in data.subject and data.html
    const { to, fromEmail, data } = payload

    if (!data?.subject || !data?.html) {
      throw new Error('DirectSMTPEmailProvider requires data.subject and data.html')
    }

    const from = fromEmail || appConfig.EMAIL_FROM

    // Send to each recipient individually
    for (const recipient of to) {
      await this.transporter.sendMail({
        from,
        to: recipient.email,
        subject: data.subject as string,
        html: data.html as string,
      })
    }
  }
}