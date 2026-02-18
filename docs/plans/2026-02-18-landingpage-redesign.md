# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Visually enrich the compact landing page splash screen with an earthy radial gradient, icon card treatment, typographic hierarchy, and filled feature copy — without changing structure or behavior.

**Architecture:** Single Vue SFC edit (`LandingPage.vue`) plus one i18n string update. All changes are SCSS + template cosmetics. No new components, no routing changes, no backend involvement.

**Tech Stack:** Vue 3 SFC, Bootstrap Vue Next, SCSS (scoped), `packages/shared/i18n/en.json`

**Branch:** `feat/landingpage-redesign`

---

### Task 1: Baseline smoke test for LandingPage

No test currently exists. Write one so future changes don't silently break the component.

**Files:**
- Create: `apps/frontend/src/features/landingpage/__tests__/LandingPage.spec.ts`

**Step 1: Create the test file**

```ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'

// --- mocks (must be before the component import) ---
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string, p?: Record<string, string>) => {
    if (p) return Object.entries(p).reduce((s, [k, v]) => s.replace(`{${k}}`, v), k)
    return k
  }}),
}))

vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({ setLanguage: vi.fn() }),
}))

// Stub SVG file imports — Vite transforms them to components
vi.mock('@/assets/icons/app/cupid.svg', () => ({ default: defineComponent({ template: '<svg />' }) }))
vi.mock('@/assets/icons/app/socialize.svg', () => ({ default: defineComponent({ template: '<svg />' }) }))
vi.mock('@/assets/icons/interface/globe.svg', () => ({ default: defineComponent({ template: '<svg />' }) }))
vi.mock('@/assets/icons/app/logo.svg', () => ({ default: defineComponent({ template: '<svg />' }) }))

// Stub Bootstrap Vue Next and FontAwesome to avoid full registration
const bStubs = {
  BContainer: defineComponent({ template: '<div><slot /></div>' }),
  BRow: defineComponent({ template: '<div><slot /></div>' }),
  BCol: defineComponent({ template: '<div><slot /></div>' }),
  BButton: defineComponent({
    props: ['disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  }),
  FontAwesomeIcon: defineComponent({ template: '<span />' }),
  LanguageSelectorDropdown: defineComponent({ template: '<div />' }),
}

// Stub dynamic import used in enterApp()
vi.stubGlobal('__APP_CONFIG__', { SITE_NAME: 'TestSite' })

import LandingPage from '../views/LandingPage.vue'

describe('LandingPage', () => {
  it('mounts without errors', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the Enter button', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('landingpage.enter_button')
  })

  it('renders the socialize feature text', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    expect(wrapper.text()).toContain('landingpage.socialize_1')
  })

  it('renders the date feature text', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    expect(wrapper.text()).toContain('landingpage.date_1')
  })
})
```

**Step 2: Run it and confirm it passes**

```bash
pnpm --filter frontend vitest run src/features/landingpage/__tests__/LandingPage.spec.ts
```

Expected: 4 passing tests.

> Note: `socialize_1` and `date_1` tests will pass even with empty strings because `t()` returns the key. They become meaningful in Task 2.

**Step 3: Commit**

```bash
git add apps/frontend/src/features/landingpage/__tests__/LandingPage.spec.ts
git commit -m "test(landingpage): add baseline smoke tests"
```

---

### Task 2: Fill in the feature i18n strings

**Files:**
- Modify: `packages/shared/i18n/en.json` (lines 12–13)

**Step 1: Update the strings**

Find and replace the two empty strings in the `landingpage` section:

```json
"socialize_1": "Find travel companions, local friends, and like-minded souls nearby",
"date_1": "Meet a soulmate, a partner, or someone to share the journey with",
```

**Step 2: Run the i18n validator**

```bash
pnpm --filter frontend test
```

Expected: all pass. The `socialize_1` / `date_1` test cases in the smoke test will now render actual text (but the test still passes since `t(key)` returns the key in test mode — that's fine, the strings are not empty in production).

**Step 3: Commit**

```bash
git add packages/shared/i18n/en.json
git commit -m "feat(i18n): add landing page feature copy for socialize and date cards"
```

---

### Task 3: Apply radial gradient background

Replace the flat `bg-light` background with the warm earthy radial gradient.

**Files:**
- Modify: `apps/frontend/src/features/landingpage/views/LandingPage.vue`

**Step 1: Remove `bg-light` from the wrapper div, add a class**

Find:
```html
<div
  style="min-height: 100%"
  class="bg-light posiion-relative"
>
```

Replace with:
```html
<div
  class="lp-wrapper position-relative"
>
```

(Note: `posiion-relative` in the original is a typo — drop it, `position-relative` comes from Bootstrap if needed but isn't needed here since nothing depends on it.)

**Step 2: Add the gradient and wrapper styles to the `<style>` block**

Add inside the existing `<style lang="scss" scoped>` section, after the existing imports:

```scss
.lp-wrapper {
  min-height: 100%;
  background: radial-gradient(ellipse at 50% 40%, #faf4ea 0%, #e0c99a 55%, #c9a97a 100%);
  position: relative;
}
```

**Step 3: Update `main::after` to match the gradient bottom**

The existing `main::after` creates a scroll fade to `bg-light` color. Update it to fade to the gradient's warm edge color instead:

Find:
```scss
main::after {
  content: '';
  position: sticky;
  bottom: 0;
  display: block;
  height: 5rem;
  width: 100%;
  background: linear-gradient(
    to top,
    transparentize(map-get($theme-colors, 'light'), 0),
    transparentize(map-get($theme-colors, 'light'), 1)
  );
  pointer-events: none; /* let clicks pass through */
}
```

Replace with:
```scss
main::after {
  content: '';
  position: sticky;
  bottom: 0;
  display: block;
  height: 5rem;
  width: 100%;
  background: linear-gradient(to top, rgba(#c9a97a, 0.85), rgba(#c9a97a, 0));
  pointer-events: none;
}
```

**Step 4: Run smoke tests**

```bash
pnpm --filter frontend vitest run src/features/landingpage/__tests__/LandingPage.spec.ts
```

Expected: all 4 pass.

**Step 5: Commit**

```bash
git add apps/frontend/src/features/landingpage/views/LandingPage.vue
git commit -m "feat(landingpage): apply earthy radial gradient background"
```

---

### Task 4: Typographic hierarchy — accent the site name

**Files:**
- Modify: `apps/frontend/src/features/landingpage/views/LandingPage.vue`

**Step 1: Wrap `{siteName}` in the title with an accent span**

Find the large-screen title:
```html
<span class="d-none d-md-inline-block">
  {{ t('landingpage.title_lg', { siteName: siteName }) }}
</span>
```

The `t()` call returns a plain string — to style just the site name, pass it as a separate element. Restructure to:

```html
<span class="d-none d-md-inline-block">
  {{ t('landingpage.title_lg', { siteName: '' }).trim() }}&nbsp;<span class="site-name">{{ siteName }}</span>
</span>
```

And the small-screen title:
```html
<span class="d-inline-block d-md-none">
  {{ t('landingpage.title', { siteName: siteName }) }}
</span>
```

Replace with:
```html
<span class="d-inline-block d-md-none site-name">{{ siteName }}</span>
```

**Step 2: Improve body text container**

Find:
```html
<div class="my-md-3 fs-5 pre-line">
  {{ t('landingpage.subtitle_1') }}
</div>
```

Replace with:
```html
<div class="my-md-3 fs-5 lp-body-text">
  {{ t('landingpage.subtitle_1') }}
</div>
```

**Step 3: Add styles**

```scss
.site-name {
  color: map-get($theme-colors, 'primary'); // earth brown #5e4b2c
  font-weight: 700;
}

.lp-body-text {
  line-height: 1.8;
  color: map-get($theme-colors, 'dark'); // dark soil #2e2c26
  white-space: pre-line;
}
```

(The existing `pre-line` class can be removed from the div — `white-space: pre-line` is now in `.lp-body-text`.)

**Step 4: Run tests and commit**

```bash
pnpm --filter frontend vitest run src/features/landingpage/__tests__/LandingPage.spec.ts
git add apps/frontend/src/features/landingpage/views/LandingPage.vue
git commit -m "feat(landingpage): typographic hierarchy — accent site name, improve body text"
```

---

### Task 5: Icon card "pebble" treatment

**Files:**
- Modify: `apps/frontend/src/features/landingpage/views/LandingPage.vue`

**Step 1: Wrap each icon in a circle backing element**

Find the socialize column content:
```html
<div class="d-flex flex-column align-items-center py-3 text-center">
  <div class="icon-wrapper text-social mb-lg-3">
    <IconSocialize class="svg-icon-100" />
  </div>
  <div>
    {{ t('landingpage.socialize_1') }}
  </div>
</div>
```

Replace with:
```html
<div class="d-flex flex-column align-items-center py-3 text-center lp-feature-card">
  <div class="icon-wrapper mb-lg-3">
    <div class="icon-circle icon-circle--social">
      <IconSocialize class="svg-icon-100 text-social" />
    </div>
  </div>
  <div class="lp-feature-text">
    {{ t('landingpage.socialize_1') }}
  </div>
</div>
```

Find the date column content:
```html
<div class="d-flex flex-column align-items-center py-3 text-center">
  <div class="icon-wrapper text-dating mb-lg-3">
    <IconDate class="svg-icon-100" />
  </div>
  <div>
    {{ t('landingpage.date_1') }}
  </div>
</div>
```

Replace with:
```html
<div class="d-flex flex-column align-items-center py-3 text-center lp-feature-card">
  <div class="icon-wrapper mb-lg-3">
    <div class="icon-circle icon-circle--dating">
      <IconDate class="svg-icon-100 text-dating" />
    </div>
  </div>
  <div class="lp-feature-text">
    {{ t('landingpage.date_1') }}
  </div>
</div>
```

**Step 2: Add styles**

```scss
.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(#faf4ea, 0.75);
  box-shadow: 0 2px 12px rgba(#5e4b2c, 0.12);
  padding: 0.75rem;
}

.lp-feature-text {
  font-size: $font-size-sm;
  color: map-get($theme-colors, 'secondary'); // weathered stone
  line-height: 1.5;
  max-width: 16rem;
}
```

**Step 3: Run tests and commit**

```bash
pnpm --filter frontend vitest run src/features/landingpage/__tests__/LandingPage.spec.ts
git add apps/frontend/src/features/landingpage/views/LandingPage.vue
git commit -m "feat(landingpage): icon pebble card treatment with circular backing"
```

---

### Task 6: Decorative corner accents

Add two large, blurred CSS ellipses as decorative organic warmth at the corners. These sit behind all content and read as texture.

**Files:**
- Modify: `apps/frontend/src/features/landingpage/views/LandingPage.vue`

**Step 1: Add `::before` and `::after` to `.lp-wrapper`**

Append to the `.lp-wrapper` rule in the style block:

```scss
.lp-wrapper {
  // ... existing rules ...

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  // Bottom-left warm clay blob
  &::before {
    width: 28rem;
    height: 20rem;
    bottom: -6rem;
    left: -8rem;
    background: rgba(#a43d30, 0.07); // clay red, very faint
    filter: blur(3rem);
  }

  // Top-right olive blob
  &::after {
    width: 22rem;
    height: 18rem;
    top: -4rem;
    right: -6rem;
    background: rgba(#6b8e23, 0.08); // olive green, very faint
    filter: blur(2.5rem);
  }
}
```

**Step 2: Ensure content sits above the blobs**

The `<header>` already has `z-index: 1000`. Ensure `<main>` and `<footer>` don't get hidden behind `z-index: 0` blobs — add `position: relative; z-index: 1` to main in the style block:

```scss
main {
  position: relative;
  z-index: 1;
}
```

**Step 3: Run tests and commit**

```bash
pnpm --filter frontend vitest run src/features/landingpage/__tests__/LandingPage.spec.ts
git add apps/frontend/src/features/landingpage/views/LandingPage.vue
git commit -m "feat(landingpage): add subtle organic corner accent blobs"
```

---

### Task 7: CTA button lift

Add a gentle box-shadow to the Enter button so it lifts off the gradient.

**Files:**
- Modify: `apps/frontend/src/features/landingpage/views/LandingPage.vue`

**Step 1: Update the button styles**

The existing scoped style block has:
```scss
button {
  @include media-breakpoint-up(md) {
    font-size: 3rem;
  }
}
```

Add a box-shadow:
```scss
button {
  box-shadow: 0 4px 20px rgba(#5e4b2c, 0.25);

  @include media-breakpoint-up(md) {
    font-size: 3rem;
  }
}
```

**Step 2: Run the full test suite**

```bash
pnpm --filter frontend test
```

Expected: all pass.

**Step 3: Format**

```bash
pnpm --filter frontend exec prettier --write src/features/landingpage/views/LandingPage.vue src/features/landingpage/__tests__/LandingPage.spec.ts
```

**Step 4: Final commit**

```bash
git add apps/frontend/src/features/landingpage/views/LandingPage.vue
git commit -m "feat(landingpage): lift CTA button with box-shadow"
```

---

### Task 8: Run full suite and open PR

**Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: all pass. Fix any failures before continuing.

**Step 2: Push and open PR**

```bash
git push -u origin feat/landingpage-redesign
gh pr create \
  --title "feat(landingpage): earthy visual redesign — radial gradient, pebble cards, typography" \
  --body "$(cat <<'EOF'
## Summary
- Replaces flat beige background with warm earthy radial gradient (cream centre → ochre edges)
- Icon feature cards get circular translucent backing ("pebbles")
- Site name typographically accented in earth brown
- Body text improved with better line-height and contrast
- Subtle organic corner blobs add depth
- CTA button gets a soft lift shadow
- Fills in previously empty `socialize_1` / `date_1` i18n strings
- Adds baseline smoke test for LandingPage (no tests existed before)

## Test plan
- [ ] `pnpm --filter frontend test` passes
- [ ] Visually check at mobile (375px), tablet (768px), desktop (1280px)
- [ ] Verify Enter button works (loads the app)
- [ ] Check language selector still functional
- [ ] Confirm no WCAG contrast failures on the text over gradient

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
