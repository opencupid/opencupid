---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Replace MaxMind WebServiceClient with the self-hosted observabilitystack/geoip-api service for IP-based country lookup. The frontend now resolves the user's country once at startup via a non-blocking `appStore.initialize()` call, pre-populates the onboarding location step, and uses the detected country as a default bias for geocoding searches.
