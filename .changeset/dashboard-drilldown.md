---
'@opencupid/admin': minor
'@opencupid/backend': minor
---

Add dashboard drill-down modal for Interactions and Messages KPIs. Clicking
the KPI card opens a modal with detailed bar charts (likes / anonymous /
matches for interactions; messages sent / new conversations for messages)
across a configurable timeline (24h / 72h / 7d, default 72h), backed by a new
`/admin/stats/breakdown` endpoint with hourly or daily buckets.
