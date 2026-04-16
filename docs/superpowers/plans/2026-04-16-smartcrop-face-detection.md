# Smartcrop Face Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled crop geometry in `imageprocessor.ts` with `smartcrop-sharp` + BlazeFace face boosts so that all image variants (especially the 4:3 profile) reliably frame the subject's face.

**Architecture:** `smartcrop-sharp` provides content-aware cropping (skin, saturation, edges, rule-of-thirds). BlazeFace detections are passed as `boost` regions so faces are prioritized. This replaces ~60 lines of custom geometry that fails when the target aspect ratio can't fit the source image bounds.

**Tech Stack:** smartcrop-sharp (^2.0.8), smartcrop (transitive), sharp (existing), @tensorflow-models/blazeface (existing), @tensorflow/tfjs (existing), Vitest (existing)

**Spec:** `docs/superpowers/specs/2026-04-16-smartcrop-face-detection-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/backend/package.json` | Add `smartcrop-sharp` dependency |
| Modify | `apps/backend/src/services/imageprocessor.ts` | Replace `getFaceAwareCrop` + geometry helpers with `getSmartCrop` |
| Modify | `apps/backend/src/services/image.service.ts:186` | Update call site to use `getSmartCrop` |
| Modify | `apps/backend/src/__tests__/services/imageprocessor.spec.ts` | Update tests for new method, add integration test |

---

### Task 1: Install smartcrop-sharp

**Files:**
- Modify: `apps/backend/package.json`

- [ ] **Step 1: Install the dependency**

```bash
cd /home/user/opencupid && pnpm --filter backend add smartcrop-sharp
```

- [ ] **Step 2: Verify installation**

```bash
cd /home/user/opencupid && node -e "const sc = require('smartcrop-sharp'); console.log(typeof sc.crop)"
```

Expected: `function`

If the peer dependency on sharp causes a resolution error, add to the root `package.json`:
```json
"pnpm": { "overrides": { "smartcrop-sharp>sharp": "$sharp" } }
```
Then re-run `pnpm install`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore: add smartcrop-sharp dependency"
```

---

### Task 2: Replace crop logic in ImageProcessor

**Files:**
- Modify: `apps/backend/src/services/imageprocessor.ts`

- [ ] **Step 1: Add smartcrop-sharp import**

At line 2 (after the `blurhash` import), add:

```typescript
import smartcrop from 'smartcrop-sharp'
```

- [ ] **Step 2: Delete the hand-rolled geometry functions**

Delete these functions entirely (lines 44–94):

- `expandRect` (lines 44–53)
- `ensureAspect` (lines 55–70)
- `maximizeWithinBounds` (lines 72–85)
- `shiftInsideBounds` (lines 87–94)

Keep `clamp`, `clampRect`, and `toIntRect` — they are still used by `extractAndResize`.

- [ ] **Step 3: Delete `pickPrimaryFace`**

Delete the `pickPrimaryFace` method (lines 130–133). Smartcrop uses all boosts rather than picking one.

- [ ] **Step 4: Replace `getFaceAwareCrop` with `getSmartCrop`**

Delete the entire `getFaceAwareCrop` method (lines 159–190) and replace with:

```typescript
  /**
   * Content-aware crop using smartcrop-sharp with face detection boosts.
   * Smartcrop scores candidate regions by skin tone, saturation, edges,
   * and rule-of-thirds composition. Detected faces are passed as boost
   * regions so they are prioritized in the scoring.
   */
  async getSmartCrop(targetW: number, targetH: number): Promise<Rect> {
    const boosts = this.faces.map((f) => ({
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

- [ ] **Step 5: Verify the file compiles**

```bash
cd /home/user/opencupid && pnpm --filter backend exec tsc --noEmit --pretty src/services/imageprocessor.ts 2>&1 | head -20
```

If there's no `tsconfig` path resolution for a standalone check, use the full type-check:

```bash
cd /home/user/opencupid && pnpm type-check
```

Expected: no errors in `imageprocessor.ts`. There will be an error in `image.service.ts` because it still calls `getFaceAwareCrop` — that's expected and fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/imageprocessor.ts
git commit -m "refactor: replace hand-rolled crop geometry with smartcrop-sharp

Delete expandRect, ensureAspect, maximizeWithinBounds, shiftInsideBounds,
pickPrimaryFace, and getFaceAwareCrop. Add getSmartCrop which delegates to
smartcrop-sharp with BlazeFace detections as boost regions."
```

---

### Task 3: Update the call site in image.service.ts

**Files:**
- Modify: `apps/backend/src/services/image.service.ts:185-187`

- [ ] **Step 1: Update `generateAllVariants` to call `getSmartCrop`**

In `generateAllVariants`, change line 186 from:

```typescript
        const rect = await processor.getFaceAwareCrop(width, height!, { paddingRatio: 0.75 })
```

to:

```typescript
        const rect = await processor.getSmartCrop(width, height!)
```

- [ ] **Step 2: Type-check**

```bash
cd /home/user/opencupid && pnpm type-check
```

Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/services/image.service.ts
git commit -m "refactor: update image service to use getSmartCrop"
```

---

### Task 4: Update unit tests

**Files:**
- Modify: `apps/backend/src/__tests__/services/imageprocessor.spec.ts`

- [ ] **Step 1: Add smartcrop-sharp mock**

At the top of the file, after the existing `blazeface` mock (line 12), add a mock for `smartcrop-sharp`:

```typescript
const mockSmartcrop = vi.fn(async (_img: any, opts: any) => ({
  topCrop: { x: 100, y: 50, width: opts.width, height: opts.height },
}))

vi.mock('smartcrop-sharp', () => ({
  default: { crop: mockSmartcrop },
}))
```

- [ ] **Step 2: Update test "can extract and resize cropped image"**

Replace the existing test (lines 43–55) with:

```typescript
  it('can extract and resize cropped image', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()
    const rect = await processor.getSmartCrop(300, 300)

    const outPath = path.join(TMP_DIR, 'crop-output.webp')
    await processor.extractAndResize(rect, 300, 300, outPath)

    const meta = await sharp(outPath).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(300)
    expect(meta.height).toBe(300)
  })
```

- [ ] **Step 3: Update test "getSmartCrop returns valid rect with no faces"**

Replace the "getFaceAwareCrop returns valid rect with no faces" test (lines 70–79) with:

```typescript
  it('getSmartCrop returns valid rect with no faces', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(150, 150)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
  })
```

- [ ] **Step 4: Update test "getSmartCrop produces a usable crop for extractAndResize"**

Replace the "getFaceAwareCrop produces a usable crop" test (lines 81–98) with:

```typescript
  it('getSmartCrop produces a usable crop for extractAndResize', async () => {
    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(600, 600)
    const outPath = path.join(TMP_DIR, 'face-crop-output.webp')
    await processor.extractAndResize(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      600,
      600,
      outPath
    )

    const meta = await sharp(outPath).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(600)
    expect(meta.height).toBe(600)
  })
```

- [ ] **Step 5: Update test "getSmartCrop passes face boosts to smartcrop"**

Replace the "getFaceAwareCrop returns bounded rect when face detected" test (lines 100–129) with:

```typescript
  it('getSmartCrop passes face boosts to smartcrop', async () => {
    mockEstimateFaces.mockResolvedValueOnce([
      { topLeft: [500, 600], bottomRight: [800, 1000], probability: [0.95] },
    ])

    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    const rect = await processor.getSmartCrop(600, 600)

    // Verify smartcrop was called with the face as a boost
    expect(mockSmartcrop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: 600,
        height: 600,
        boost: [
          expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number),
            weight: 1.0,
          }),
        ],
      })
    )

    // Rect comes from the mock topCrop
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.width).toBe(600)
    expect(rect.height).toBe(600)
  })
```

- [ ] **Step 6: Replace the "handles face near edge" test**

Replace the "getFaceAwareCrop handles face near image edge" test (lines 131–147) with:

```typescript
  it('getSmartCrop calls smartcrop without boost when no faces detected', async () => {
    mockEstimateFaces.mockResolvedValueOnce([])
    mockSmartcrop.mockClear()

    const processor = new ImageProcessor(buffer)
    await processor.analyze()

    await processor.getSmartCrop(150, 150)

    expect(mockSmartcrop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: 150,
        height: 150,
        boost: undefined,
      })
    )
  })
```

- [ ] **Step 7: Run the tests**

```bash
cd /home/user/opencupid && pnpm --filter backend exec vitest run src/__tests__/services/imageprocessor.spec.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/__tests__/services/imageprocessor.spec.ts
git commit -m "test: update imageprocessor tests for smartcrop-sharp"
```

---

### Task 5: Visual verification with real images

**Files:** None (verification only)

- [ ] **Step 1: Write a reprocessing script**

Create a temporary script at `apps/backend/reprocess-test.mjs`:

```typescript
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import * as tf from '@tensorflow/tfjs'
tf.env().set('IS_NODE', false)
import '@tensorflow/tfjs-backend-cpu'

import { ImageProcessor } from './src/services/imageprocessor.ts'

await ImageProcessor.initialize()

const imageDir = '/srv/images/images/cmnbzd31n00ggp0019p12dxch'
const outDir = '/tmp/smartcrop-test'
await fs.promises.mkdir(outDir, { recursive: true })

const variants = [
  { name: 'thumb', width: 128, height: 128 },
  { name: 'card', width: 600, height: 600 },
  { name: 'profile', width: 1200, height: 900 },
]

for (const file of ['x4m00l5-original.jpg', '3dn00vq-original.jpg']) {
  const buf = await fs.promises.readFile(path.join(imageDir, file))
  const oriented = await sharp(buf).rotate().toBuffer()
  const processor = new ImageProcessor(oriented)
  await processor.analyze()

  const base = file.replace('-original.jpg', '')
  for (const v of variants) {
    const rect = await processor.getSmartCrop(v.width, v.height)
    const outPath = path.join(outDir, `${base}-${v.name}-NEW.webp`)
    await processor.extractAndResize(rect, v.width, v.height, outPath)
    console.log(`${base}-${v.name}: crop at (${rect.left}, ${rect.top}) ${rect.width}x${rect.height} → ${outPath}`)
  }
}

console.log('\nDone. Compare files in /tmp/smartcrop-test/ with originals in', imageDir)
```

- [ ] **Step 2: Run the reprocessing script**

```bash
cd /home/user/opencupid/apps/backend && npx tsx reprocess-test.mjs
```

Expected: prints crop coordinates and output paths for all 6 variants.

- [ ] **Step 3: Visually inspect the new profile variants**

Open and compare:
- `/tmp/smartcrop-test/x4m00l5-profile-NEW.webp` — face should be fully visible (forehead to chin)
- `/tmp/smartcrop-test/3dn00vq-profile-NEW.webp` — face should be fully visible
- Compare card and thumb variants to ensure they remain good

- [ ] **Step 4: Clean up and commit**

```bash
rm apps/backend/reprocess-test.mjs
```

No git commit for this task — it's verification only.

---

### Task 6: Run full test suite and format

**Files:** All modified files

- [ ] **Step 1: Run the full backend test suite**

```bash
cd /home/user/opencupid && pnpm --filter backend test
```

Expected: all tests pass.

- [ ] **Step 2: Run type-check**

```bash
cd /home/user/opencupid && pnpm type-check
```

Expected: passes.

- [ ] **Step 3: Run lint**

```bash
cd /home/user/opencupid && pnpm lint
```

Expected: passes.

- [ ] **Step 4: Format changed files**

```bash
pnpm exec prettier --write \
  apps/backend/src/services/imageprocessor.ts \
  apps/backend/src/services/image.service.ts \
  apps/backend/src/__tests__/services/imageprocessor.spec.ts
```

- [ ] **Step 5: Commit formatting if any changes**

```bash
git diff --quiet || (git add -u && git commit -m "style: format changed files")
```

---

### Task 7: Add changeset

**Files:**
- Create: `.changeset/<random-name>.md`

- [ ] **Step 1: Create changeset file**

```bash
cat > .changeset/smart-crops-bloom.md << 'EOF'
---
'@opencupid/backend': patch
---

Fix profile image variant cutting off faces by replacing hand-rolled crop
geometry with smartcrop-sharp content-aware cropping and BlazeFace face boosts
EOF
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/smart-crops-bloom.md
git commit -m "chore: add changeset for smartcrop face detection fix"
```
