import type { EmailPayload } from '@/services/email/types'

type EmailSender = {
  sendEmail: (payload: EmailPayload) => Promise<unknown>
}

export async function processEmailJob(
  payload: EmailPayload,
  emailSender: EmailSender
): Promise<void> {
  await emailSender.sendEmail(payload)
}
