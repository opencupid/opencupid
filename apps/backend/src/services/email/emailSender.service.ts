

import { appConfig } from '@/lib/appconfig'
import nodemailer from 'nodemailer'
import { renderEmail } from './emailRenderer'
// TODO FIXME
/*
Could not find a declaration file for module '../../../dist-ssr/EmailTemplate.ssr.mjs'. '/home/user/opencupid/apps/backend/dist-ssr/EmailTemplate.ssr.mjs' implicitly has an 'any' type.ts(7016)
*/
import EmailTemplate from "../../../dist-ssr/EmailTemplate.ssr.mjs";



export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: appConfig.SMTP_HOST,
      port: Number(appConfig.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: appConfig.SMTP_USER,
        pass: appConfig.SMTP_PASS,
      },
    })
  }

  // TODO - refactor - introduce a shared type for the email payload 
  // see apps/backend/src/queues/dispatcher.ts
  async sendMail(
    to: string,
    subject: string,
    publicName: string,
    callToActionLabel: string,
    callToActionUrl: string,
    contentBody: string,
    footer: string,
    from: string
  ) {
    const html = await renderEmail(EmailTemplate, {
      siteName: appConfig.SITE_NAME,
      publicName,
      callToActionLabel,
      callToActionUrl,
      contentBody,
      footer,
    })

    const mailOptions = {
      from,
      to,
      subject,
      html,
    }

    return this.transporter.sendMail(mailOptions)
  }
}

export const emailService = new EmailService()
