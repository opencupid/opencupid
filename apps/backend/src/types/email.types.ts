export type TxPayload = {
  to: { email: string; name?: string; subscriberId?: number }[] // allow email-only
  templateId: number
  data?: Record<string, unknown>
  contentType?: 'html' | 'markdown' | 'plain'
  fromEmail?: string
  headers?: Record<string, string>[]
  attachments?: { filename: string; content: Buffer }[]
}

export interface EmailProvider {
  sendTransactional(payload: TxPayload): Promise<void>
}