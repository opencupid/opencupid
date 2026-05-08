---
'@opencupid/backend': patch
'@opencupid/frontend': patch
---

Drop deprecated dependencies: replace `cuid` with `nanoid` for media slug
generation, and remove the unused `@types/dompurify` (DOMPurify v3 ships its
own types).
