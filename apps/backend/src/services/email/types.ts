export type EmailTemplateProps = {
  siteName: string
  publicName: string
  contentBody: string
  callToActionLabel: string
  callToActionUrl: string
  footer?: string
}

export type EmailPayload = {
  to: string
  subject: string
  templateProps: EmailTemplateProps
}
