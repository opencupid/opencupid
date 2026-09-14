---
'@opencupid/backend': minor
---

Harden transactional email against junk-folder classification: send a
plain-text alternative part instead of leaving the relay to synthesise one,
stamp the recipient's language on `<html lang>` instead of a hardcoded `en`,
and escape `contentBody` rather than rendering it raw. Adds an optional
`EMAIL_REPLY_TO` to set a Reply-To header on outgoing mail.
