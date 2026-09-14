import type { Brand } from '../../lib/brand'

export type EmailTemplateProps = {
  siteName: string
  publicName: string
  contentBody: string
  callToActionLabel: string
  callToActionUrl: string
  fallbackHint: string
  footer?: string
  unsubscribeUrl?: string
  unsubscribeLabel?: string
}

export type EmailPayload = {
  to: string
  subject: string
  /** Recipient's language tag, stamped on the rendered document's <html lang>. */
  language: string
  brand: Brand
  templateProps: EmailTemplateProps
  headers?: Record<string, string>
}
