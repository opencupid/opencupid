---
'@opencupid/backend': minor
---

Read brands from one `<name>.env` file per brand in `BRANDS_DIR`, the same files the brand frontends use, instead of the `BRANDS` JSON. Breaking for multi-brand deployments: replace `BRANDS` with a mounted `brands/` directory.
