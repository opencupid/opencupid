# Landing Page Redesign — Design Document

**Date:** 2026-02-18
**Keywords:** earthy, natural, friendly
**Scope:** Visual refresh of `apps/frontend/src/features/landingpage/views/LandingPage.vue` — compact splash page, no structural changes to sections.

---

## Context

OpenCupid's landing page is a compact splash screen shown before the user enters the app. It introduces the platform and its community (the "Gaians" — a permaculture/back-to-land community) and has a single CTA: the "Enter" button. It is not a marketing multi-pager; the long body paragraph is the main content, intentional and kept as-is.

**Current problems:**
- Flat, visually plain — just a beige background with no depth
- Feature icon columns have empty text (i18n keys `socialize_1` / `date_1` are blank)
- No typographic hierarchy beyond basic heading
- No warmth or visual richness despite the earthy color palette

---

## Design Decisions

### 1. Background — Radial Warm Gradient

A CSS radial gradient from warm linen-cream at the center outward to ochre/sand at the edges. Creates a campfire-glow effect: the eye is drawn to the content in the center, and the edges feel grounded and warm.

```scss
background: radial-gradient(ellipse at 50% 40%, #faf4ea 0%, #e0c99a 55%, #c9a97a 100%);
```

The gradient replaces the flat `bg-light` class.

### 2. Typography

- **Site name** (`{siteName}` within the title): visually accented in the theme's `primary` earth brown (`#5e4b2c`), using a `<span>` wrapper, to give the brand name a moment
- **Body text** (main paragraph): improved line-height (`1.8`), slightly constrained max-width for readability, color shifted to `dark` (`#2e2c26`) for better contrast on the gradient
- **Fonts** stay as-is: Nunito (body), Rubik (headings)

### 3. Feature Icon Cards

Currently two bare icon + (empty) text columns. With text filled in, they become two soft "pebble" cards:

- Each icon gets a circular translucent warm-cream backing (e.g. `rgba(255,248,236,0.7)`) with a soft `box-shadow`
- Icon sizes unchanged, colors unchanged (`text-social` navy / `text-dating` red)
- Below each icon: a short 1–2 line description in warm muted text

**New i18n strings:**
- `socialize_1`: `"Find travel companions, like-minded locals, friends — people who get it"`
- `date_1`: `"Meet a soulmate, a partner, or someone to share the journey with"`

### 4. Decorative Accents

Very subtle organic accent: a few soft botanical shapes (SVG leaf silhouettes or simple CSS ellipses) placed at low opacity (~8–12%) in the lower corners and upper edge using `::before` / `::after` on the wrapper, or an inline SVG background pattern. These should read as texture, not illustration.

Implementation: CSS `::before`/`::after` with a simple SVG `data:` URL of a single leaf path repeated, or two large blurred CSS ellipses in earthy tones at the corners.

### 5. CTA Button

Keep as-is structurally (fixed footer, pill, olive green `success`). Minor enhancements:
- Soft `box-shadow` to lift it off the gradient background
- Very subtle white inner glow on hover state

### 6. Logo

Keep as olive green SVG. No change needed — it pops naturally against the warm cream center of the gradient.

### 7. Gradient Fade (scroll affordance)

The existing `main::after` gradient fade to `bg-light` needs updating to use the same base color as the gradient bottom to avoid a visible mismatch.

---

## Files to Change

| File | Change |
|------|--------|
| `apps/frontend/src/features/landingpage/views/LandingPage.vue` | Background gradient, typography, icon card styling, decorative accents |
| `packages/shared/i18n/en.json` | Fill in `socialize_1` and `date_1` |

No new files. No routing changes. No backend changes.

---

## Non-goals

- No multi-section expansion
- No photography or external imagery
- No font changes
- No structural/layout changes (header / main / fixed footer stays)
- No changes to the Enter button behavior

---

## Success Criteria

- Page feels warm, organic, and inviting on first load
- Readable at all common viewport sizes (mobile portrait through desktop)
- Existing tests continue to pass (no logic changes)
- i18n strings for `socialize_1` / `date_1` are non-empty
