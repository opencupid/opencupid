---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Call-to-action links in notification emails carry UTM tags (`utm_source=notification`, `utm_medium=email`, `utm_campaign=<email type>`) so Umami attributes visits to the email. Only the button is tagged: the copy-paste link and the plain-text part show the clean URL, and the login link is left untagged. A logged-out click keeps the tags on the login page, so Umami counts it there.
