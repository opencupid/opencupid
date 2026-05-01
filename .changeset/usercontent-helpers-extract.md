---
'@opencupid/backend': patch
---

Extract pure where-clause / pagination helpers shared by UserContent services. PostService method bodies now compose named fragments (`visible`, `notDeleted`, `ownedBy`, `paginate`, `boundingBoxWhere`, `boundsWhere`, `softDeleteData`, `recentSince`) instead of inlining the same predicates repeatedly. Behaviour preserved.
