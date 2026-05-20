---
'@opencupid/frontend': patch
---

Fix MyProfile owner drawer crashing on first paint by making `useMyProfileViewModel`'s `publicProfile` honestly nullable instead of a phantom-empty `reactive({} as PublicProfile)`. Removes a latent class of "required field is undefined" bugs across any consumer of `profilePreview`.
