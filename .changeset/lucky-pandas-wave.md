---
'@opencupid/backend': minor
---

Expose tags on UserContent DTOs. Posts, events and communities now carry a
`tags` array resolved to the session locale, matching how Profile serves tags.
Content mappers take a `MapperContext` (`viewerProfileId` + `locale`) instead
of a bare viewer id.
