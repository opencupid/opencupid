export type EmailTemplateProps = {
  siteName: string
  publicName: string
  contentBody: string
  callToActionLabel: string
  callToActionUrl: string
  fallbackHint: string
  footer?: string
}

export type Brand = {
  siteName: string
  frontendUrl: string
  domain: string
}

export type EmailPayload = {
  to: string
  subject: string
  brand: Brand
  templateProps: EmailTemplateProps
}
