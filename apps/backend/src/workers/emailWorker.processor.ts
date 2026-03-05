import type { EmailPayload } from '@/services/email/types'

type EmailSender = {
  sendEmail: (payload: EmailPayload, from: string) => Promise<unknown>
}

export async function processEmailJob(
  payload: EmailPayload,
  emailSender: EmailSender,
  from: string
): Promise<void> {
  await emailSender.sendEmail(payload, from)
}
