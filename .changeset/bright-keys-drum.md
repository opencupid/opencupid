---
'@opencupid/ingress': minor
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Replace Redis/Lua media auth with nginx-jwt-module for JWT signature verification on /user-content/ requests; fix post-onboarding 401 caused by session deletion on profile activation; fix refresh request 415 error caused by missing Content-Type header
