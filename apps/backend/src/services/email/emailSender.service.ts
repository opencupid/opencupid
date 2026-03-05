import { appConfig } from '@/lib/appconfig'
import nodemailer from 'nodemailer'
import { renderEmail } from './emailRenderer'
import EmailTemplate from './EmailTemplate.ssr.mjs'
import type { EmailPayload } from './types'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    const port = Number(appConfig.SMTP_PORT)
    this.transporter = nodemailer.createTransport({
      host: appConfig.SMTP_HOST,
      port: port,
      secure: (port === 465), // true for 465, false for other ports
      auth: {
        user: appConfig.SMTP_USER,
        pass: appConfig.SMTP_PASS,
      },
    })
  }

  async sendEmail(payload: EmailPayload, from: string) {
    const html = await renderEmail(EmailTemplate, payload)

    const mailOptions = {
      from,
      to: payload.to,
      subject: payload.subject,
      html,
    }

    return this.transporter.sendMail(mailOptions)
  }
}

export const emailService = new EmailService()
