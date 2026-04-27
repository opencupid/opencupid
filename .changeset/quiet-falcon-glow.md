---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Replace MaxMind with self-hosted observabilitystack/geoip-api for IP-based location lookup. The backend `/location` endpoint now returns lat/lon alongside country (configurable via `GEOIP_API_URL`), and the frontend uses the resolved location to bias Photon geocoder suggestions toward the user's region.
