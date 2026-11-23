---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Magic links: re-sending a login link reuses the still-valid token so earlier emails keep working, tokens stay valid for 120 minutes instead of 15, and a link opened in a browser that did not request it asks for the captcha instead of a Continue button, which Gmail's link checker clicked.
