# Image Messages in Conversations — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Context

Users can currently send text and voice messages in conversations. This feature adds the ability to send images. Uploaded images must be optimised/converted to WebP (no face detection, no autocrop) into two variants: `inline` (shown in the message bubble) and `full` (shown in a lightbox when tapped). The feature leverages existing image processing plumbing (`ImageProcessor`, `sharp`) and mirrors the voice message upload pattern.

---

## Scope

- **In scope:** image sending in accepted conversations only; one image per message; image + optional text treated as image-only (no caption); clipboard paste support; inline thumbnail chip in compose area; `inline` bubble display; `full` lightbox on tap.
- **Out of scope:** multiple images per message, captions, sending before conversation is accepted.

---

## Data Model

No Prisma schema migration required. `MessageAttachment` already covers `filePath`, `mimeType`, `fileSize`. `duration` remains nullable and unused for images.

`messageType` values: `'text/plain'` | `'audio/voice'` | `'image/webp'` (update comment in `schema.prisma`). `'image/webp'` is used as a fixed literal for all image messages regardless of the source format (PNG, GIF, JPEG, etc.) — the output is always WebP.

`filePath` stored as base path: `message-images/{profileId}/{slug}` — **no variant suffix**. Variant URLs are constructed server-side in the mapper.

---

## Backend

### 1. `ImageProcessor` refactor — `image.service.ts` + `imageprocessor.ts`

Generalise `generateAllVariants()` in [image.service.ts](apps/backend/src/services/image.service.ts) to accept an explicit `Variant[]` parameter (currently it uses the module-level `variants` array). Existing callers pass the same array unchanged. This enables `MessageImageService` to call the same logic with a custom two-variant set without code duplication.

```ts
// Before
private async generateAllVariants(processor, outputDir, baseName): Promise<Record<string,string>>

// After
async generateAllVariants(processor, outputDir, baseName, variants: Variant[]): Promise<Record<string,string>>
```

Make `generateAllVariants` and the `Variant` type exported/public so `MessageImageService` can import and call it.

### 2. New `MessageImageService` — `apps/backend/src/services/messageImage.service.ts`

```ts
const MESSAGE_IMAGE_VARIANTS: Variant[] = [
  { name: 'inline', width: 600, fit: sharp.fit.inside },
  { name: 'full',   width: 1280, fit: sharp.fit.inside },
]
```

- `processMessageImage(buffer: Buffer, outputDir: string, baseName: string)` — creates output dir, calls `new ImageProcessor(buffer)`, then `imageService.generateAllVariants(processor, outputDir, baseName, MESSAGE_IMAGE_VARIANTS)`.
- **Do NOT call `processor.analyze()`** — it runs face detection (TensorFlow) which is unnecessary here. `resizeOriginal()` only uses `this.sharpInstance` which is set in the constructor; no metadata is needed for `fit: inside` resizing.
- No blurhash, no `original.jpg`.
- Returns `{ inlinePath: string, fullPath: string }`.
- Files saved under `{MEDIA_ROOT}/message-images/{profileId}/{slug}-inline.webp` and `...-full.webp`.

### 3. `MEDIA_SUBDIR` — `apps/backend/src/lib/media.ts`

Add `MESSAGE_IMAGES: 'message-images'` to the `MEDIA_SUBDIR` const. `checkUserContentRoot()` already iterates all values, so the new subdirectory is created automatically on startup.

Add helper `messageImageBasePath(storagePath: string)` mirroring `voiceBasePath`.

### 4. New `messageMedia.route.ts` — `apps/backend/src/api/routes/messageMedia.route.ts`

Extract the voice upload endpoint from `messaging.route.ts` and add the image upload endpoint here. Both share:
- A single `@fastify/multipart` registration with `fileSize: Math.max(voiceFileSize, appConfig.IMAGE_MESSAGE_MAX_SIZE)`.
- A shared `broadcastAndNotify(fastify, recipientId, messageDTO, notificationContent)` helper to eliminate the duplicated WS→web-push→notifier fallback block.

**`POST /messages/voice`** — moved verbatim from `messaging.route.ts`, refactored to use shared helper.

**`POST /messages/image`** — new endpoint:
1. Parse multipart: file buffer + `profileId` field.
2. Validate MIME must start with `image/`; validate size ≤ `IMAGE_MESSAGE_MAX_SIZE`.
3. Generate `slug` (cuid.slug), build `outputDir = {MEDIA_ROOT}/message-images/{profileId}/`.
4. Call `messageImageService.processMessageImage(buffer, outputDir, slug)`.
5. Call `messageService.sendOrStartConversation(tx, senderProfileId, profileId, '', 'image/webp', { filePath: \`message-images/\${profileId}/\${slug\}`, mimeType, fileSize })`.
6. Respond with `SendMessageResponse`, then call `broadcastAndNotify`.
7. On error: clean up written files.

Register in [api/index.ts](apps/backend/src/api/index.ts): `fastify.register(messageMediaRoutes, { prefix: '/messages' })`.

### 5. `messaging.route.ts`

Remove the voice upload endpoint (moved to `messageMedia.route.ts`). Keep text message and read/list endpoints.

### 6. `MessageAttachmentDTO` — `packages/shared/zod/messaging/messaging.dto.ts`

Add `fullUrl: z.string().nullable().optional()` to `MessageAttachmentDTOSchema`.

### 7. Mapper — `apps/backend/src/api/mappers/messaging.mappers.ts`

Update `mapAttachmentDTO`: when `mimeType.startsWith('image/')`, set:
```ts
url = mediaUrl(filePath + '-inline.webp')
fullUrl = mediaUrl(filePath + '-full.webp')
```
Otherwise (voice/other): `url = mediaUrl(filePath)`, `fullUrl = null`.

### 8. `appConfig` — `apps/backend/src/lib/appconfig.ts` + `.env.example`

Add `IMAGE_MESSAGE_MAX_SIZE: z.coerce.number().default(10 * 1024 * 1024)` (10 MB default). Add to `.env.example`.

---

## Frontend

### 9. `SendMessageForm.vue` — compose area changes

- Add `pendingImage: File | null` ref.
- When `pendingImage` is set: show thumbnail chip above textarea (Option A layout — compact with × dismiss). Textarea is disabled; text content is cleared and ignored on send. Image picker button is dimmed.
- Textarea also accepts `paste` events containing `image/*` items from `event.clipboardData.files`.
- Add an image picker button (📎 / image icon) in the toolbar alongside the voice recorder button. Button is hidden/disabled when `!canReply` (consistent with voice recorder gating). Clicking it triggers a hidden `<input type="file" accept="image/*">`.
- On SEND (click or Enter): if `pendingImage` is set, call `messageStore.sendImageMessage(recipientId, pendingImage)` instead of `sendMessage`. Clear `pendingImage` on success.

### 10. `messageStore.ts` — new action

```ts
async sendImageMessage(recipientProfileId: string, file: File): Promise<StoreResponse<MessageDTO> | StoreError> {
  // FormData: file + profileId
  // POST /messages/image
  // Delegates to handleSendResponse
}
```

### 11. New `ImageMessage.vue` — `apps/frontend/src/features/messaging/components/ImageMessage.vue`

- Props: `attachment: MessageAttachmentDTO`, `isMine?: boolean`.
- Renders `<img :src="attachment.url">` (inline variant) constrained to `max-width: 100%; max-height: 200px; cursor: pointer; border-radius: 10px`.
- Clicking opens `BModal` with `fullscreen`, black background, centered `<img :src="attachment.fullUrl ?? attachment.url">`.
- Close button in modal header (reuse `IconCross` pattern from `ImageCarousel`).
- Handles image load error gracefully (show broken-image placeholder).

### 12. `MessageList.vue` — render branch

Add `image/webp` branch alongside the voice branch:
```html
<ImageMessage
  v-else-if="msg.messageType === 'image/webp' && msg.attachment"
  :attachment="msg.attachment"
  :is-mine="msg.isMine"
/>
```

### 13. i18n keys — `packages/shared/i18n/en.json`

Add keys:
- `messaging.attach_image_button` — tooltip for image picker button
- `messaging.image_message_alt` — alt text for image in bubble (`"Sent image"`)
- `messaging.image_upload_error` — generic upload error toast

---

## File Summary

| File | Change |
|------|--------|
| `apps/backend/src/services/image.service.ts` | Make `generateAllVariants` accept `Variant[]` param; export `Variant` type |
| `apps/backend/src/services/messageImage.service.ts` | **New** — process inline+full WebP variants |
| `apps/backend/src/lib/media.ts` | Add `MESSAGE_IMAGES` subdir, `messageImageBasePath` helper |
| `apps/backend/src/api/routes/messageMedia.route.ts` | **New** — voice (moved) + image upload endpoints, shared broadcast helper |
| `apps/backend/src/api/routes/messaging.route.ts` | Remove voice endpoint |
| `apps/backend/src/api/index.ts` | Register `messageMediaRoutes` |
| `apps/backend/src/api/mappers/messaging.mappers.ts` | Populate `fullUrl` for image attachments |
| `apps/backend/src/lib/appconfig.ts` | Add `IMAGE_MESSAGE_MAX_SIZE` |
| `apps/backend/.env.example` | Add `IMAGE_MESSAGE_MAX_SIZE` |
| `packages/shared/zod/messaging/messaging.dto.ts` | Add `fullUrl` to `MessageAttachmentDTOSchema`; add `SendImageMessagePayloadSchema` |
| `apps/frontend/src/features/messaging/stores/messageStore.ts` | Add `sendImageMessage` action |
| `apps/frontend/src/features/messaging/components/SendMessageForm.vue` | Attach chip, paste support, image button |
| `apps/frontend/src/features/messaging/components/ImageMessage.vue` | **New** — bubble + lightbox |
| `apps/frontend/src/features/messaging/components/MessageList.vue` | Add `image/webp` render branch |
| `packages/shared/i18n/en.json` | Add 3 i18n keys |
| `apps/backend/prisma/schema.prisma` | Update `messageType` comment only |

---

## Tests to Add/Update

- `messageImage.service.spec.ts` — unit test processMessageImage produces inline+full WebP files
- `messageMedia.route.spec.ts` — integration test `POST /messages/image` (success, bad MIME, oversize)
- `messaging.mappers.spec.ts` — update to cover `fullUrl` logic for image vs voice
- `SendMessageForm.spec.ts` — test image attach chip render, dismiss, paste handler, send flow
- `ImageMessage.spec.ts` — test inline render, lightbox open/close, error fallback
- `MessageList.spec.ts` — test `image/webp` branch renders `ImageMessage`

---

## Verification

1. `pnpm dev` — navigate to `/inbox`, open an accepted conversation
2. Click the image button → select a JPEG/PNG → thumbnail chip appears above textarea
3. Paste an image from clipboard → same chip appears
4. Click × → chip dismissed, textarea re-enabled
5. Click SEND → image message appears in bubble (inline variant)
6. Click the bubble → fullscreen lightbox opens with full variant
7. Click × or backdrop → lightbox closes
8. On recipient side: receive WS push, bubble renders correctly
9. `pnpm --filter backend test` and `pnpm --filter frontend test` — all green
10. `pnpm type-check` — no errors
