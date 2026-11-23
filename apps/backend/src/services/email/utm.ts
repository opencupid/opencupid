/**
 * UTM tags for links in notification emails, so Umami attributes the visit
 * to the email that brought it. No user data: values are per email type only.
 */
export function withUtm(url: string, campaign: string): string {
  const tagged = new URL(url)
  tagged.searchParams.set('utm_source', 'notification')
  tagged.searchParams.set('utm_medium', 'email')
  tagged.searchParams.set('utm_campaign', campaign)
  return tagged.toString()
}
