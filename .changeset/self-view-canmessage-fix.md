---
'@opencupid/backend': patch
---

Fix `canMessage=true` and stale `conversationId` on self-view of public profile. The conversation include matches every conversation the viewer is in when target = viewer (because viewer is also a participant in their own conversations), so `mapConversationContext` was answering against an arbitrary conversation. Thread `viewerProfileId` through the mapper and short-circuit to inert (`canMessage=false`, `conversationId=null`) when target = viewer. Same fix applies to `mapDbPostToDetail`.
