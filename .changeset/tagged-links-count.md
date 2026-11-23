---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Call-to-action links in notification emails carry UTM tags (`utm_source=notification`, `utm_medium=email`, `utm_campaign=<email type>`) so Umami attributes visits to the email; the login link is left untagged. The tags survive the redirect to login and the logged-in redirect to Browse.
