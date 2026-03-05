export type EmailTemplateProps = {
  siteName: string
  publicName: string
  contentBody: string
  callToActionLabel: string
  callToActionUrl: string
  footer?: string
}

export type NotifiableUser = {
  id: string
  email: string | null
  language: string | null
  profile: { publicName: string } | null
}

export type EmailPayload = {
  subject: string
  contentBody: string
  footer: string
  callToActionLabel: string
  callToActionUrl: string
}