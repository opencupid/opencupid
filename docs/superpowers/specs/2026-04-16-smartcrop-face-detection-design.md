# Replace hand-rolled crop with smartcrop-sharp + BlazeFace boost

**Date:** 2026-04-16
**Status:** Draft
**Scope:** `apps/backend/src/services/imageprocessor.ts`, `apps/backend/src/services/image.service.ts`, tests

## Problem

The profile image variant (1200×900, 4:3) consistently cuts off faces. The card (600×600) and thumb (128×128) variants render acceptably from the same images.

### Root cause

`getFaceAwareCrop` implements a hand-rolled geometry pipeline: expand → clamp → ensureAspect → maximize → shift. When the target aspect ratio (4:3 landscape) requires a rect wider than the image (portrait photos), `ensureAspect` produces an out-of-bounds rect. Subsequent steps clamp the width but never compensate the height, so the rect handed to `extractAndResize` has the wrong aspect ratio. `sharp.strategy.attention` then makes the final vertical crop and gravitates toward high-contrast clothing/patterns instead of the face.

BlazeFace detection itself works correctly — the issue is entirely in post-detection geometry.

### Evidence

Traced on real images in `/srv/images/images/cmnbzd31n00ggp0019p12dxch/`:

- `x4m00l5-original.jpg` (2268×4032): BlazeFace detects face at (961, 1125, 742×1319). After the pipeline, all variants get the same 2268×3298 rect (100% width, 82% height). The profile variant must then crop vertically via `strategy.attention`, which centers on the floral shirt pattern.
- `3dn00vq-original.jpg` (1213×1857): Same pattern — all variants collapse to 1213×1741 (100% width, 94% height).

## Solution

Replace the hand-rolled geometry with **smartcrop-sharp**, a mature content-aware cropping library, using BlazeFace detections as **boost regions**.

smartcrop.js scores candidate crop regions by skin tone, saturation, edge distribution, and rule-of-thirds composition. The `boost` API accepts weighted bounding boxes (faces) that bias the scoring without overriding it. This is the canonical approach for face-aware cropping in the Node/sharp ecosystem.

## Dependencies

### Add

- `smartcrop-sharp` (^2.0.8) — sharp adapter for smartcrop.js
  - Note: `package.json` peer dep on sharp is outdated but the code works with current sharp. Use `pnpm --force` or add a `pnpm.overrides` entry if peer dep resolution fails.

### Keep

- `@tensorflow-models/blazeface` (0.1.0) — face detection for boost coordinates
- `@tensorflow/tfjs` (4.22.0) + `@tensorflow/tfjs-backend-cpu` (4.22.0)

### No new dependencies beyond smartcrop-sharp

smartcrop-sharp pulls in `smartcrop` as a transitive dependency.

## Changes

### `imageprocessor.ts`

#### Delete

- `expandRect` — no longer needed
- `ensureAspect` — no longer needed
- `maximizeWithinBounds` — no longer needed
- `shiftInsideBounds` — no longer needed

#### Keep

- `clamp`, `clampRect`, `toIntRect` — still used by `extractAndResize`
- `detectFaces()` — unchanged, provides boost coordinates
- `analyze()` — unchanged
- `extractAndResize()` — unchanged
- `resizeOriginal()` — unchanged
- `encodeBlurhash()` — unchanged

#### Also delete

- `pickPrimaryFace()` — smartcrop uses all boosts, no need to pick one face

#### Replace

`getFaceAwareCrop(targetW, targetH, opts?)` → `getSmartCrop(targetW, targetH)`

```typescript
import smartcrop from 'smartcrop-sharp'

async getSmartCrop(targetW: number, targetH: number): Promise<Rect> {
  const boosts = this.faces.map(f => ({
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    weight: 1.0,
  }))

  const result = await smartcrop.crop(this.buffer, {
    width: targetW,
    height: targetH,
    boost: boosts.length > 0 ? boosts : undefined,
  })

  const c = result.topCrop
  return { left: c.x, top: c.y, width: c.width, height: c.height }
}
```

Key points:
- All detected faces are passed as boosts (not just the primary), letting smartcrop balance multi-face compositions.
- `weight: 1.0` gives faces maximum priority. The impact is proportional to weight × area.
- When no faces are detected, smartcrop still produces a good crop via its skin/saturation/edge heuristics — far better than the current `strategy.attention` fallback on a full-image rect.
- The `paddingRatio` parameter is eliminated entirely — smartcrop handles framing.

### `image.service.ts`

In `generateAllVariants`, change the call site:

```typescript
// Before
const rect = await processor.getFaceAwareCrop(width, height!, { paddingRatio: 0.75 })

// After
const rect = await processor.getSmartCrop(width, height!)
```

No other changes to this file.

### Tests (`imageprocessor.spec.ts`)

- Update all references from `getFaceAwareCrop` to `getSmartCrop`.
- Remove `paddingRatio` option from test calls.
- Mock `smartcrop-sharp` in unit tests (it's an external dep).
- Keep existing assertions: rect within bounds, correct aspect ratio, valid output file.
- Add integration test using real images from `/srv/images/images/cmnbzd31n00ggp0019p12dxch/` to verify that the profile variant crop region includes the face (top of crop is above face `y` coordinate).

## Verification

After implementation, reprocess both test images and visually compare:

```bash
# Reprocess and inspect
node -e "..." # script to run processImage on both originals
# Compare profile variants: face should be visible with full head in frame
```

Success criteria:
- Profile variant (1200×900) includes full face for both test images
- Card and thumb variants remain at least as good as current
- All existing tests pass
- Type-check passes

## Out of scope

- Tuning BlazeFace detection resolution (detection works fine as-is)
- Changing variant dimensions or adding new variants
- Crop positioning tweaks (headroom bias, rule-of-thirds tuning) — can iterate after this lands
