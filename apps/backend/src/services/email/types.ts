import type { Brand } from '../../lib/brand'

export type EmailTemplateProps = {
  siteName: string
  publicName: string
  contentBody: string
  callToActionLabel: string
  callToActionUrl: string
  fallbackHint: string
  footer?: string
}

export type EmailPayload = {
  to: string
  subject: string
  brand: Brand
  templateProps: EmailTemplateProps
}
