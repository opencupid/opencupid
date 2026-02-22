---
name: elite-frontend-ux
description: Create distinctive, production-grade frontend interfaces with expert-level UX design. Use when building SaaS dashboards, landing pages, marketing sites, React/Vue components, HTML/CSS layouts, or any web UI. Combines bold aesthetic direction with systematic design tokens, WCAG accessibility, conversion optimization, and Tailwind/React best practices. Produces polished, memorable interfaces that avoid generic AI aesthetics while meeting professional standards.
---

# Elite Frontend UX Design Skill

Create distinctive, production-grade interfaces that combine bold aesthetics with systematic UX excellence. Every output must be visually striking AND functionally flawless.

## 1. Design Philosophy

Before writing code, commit to a clear direction:

**Context Analysis:**
- WHO uses this? (persona, expertise level, device context)
- WHAT action should they take? (single primary goal)
- WHY should they trust/engage? (value proposition)

**Aesthetic Commitment:**
Choose and COMMIT to a bold direction. Timid design fails. Options include:
- Brutally minimal (Stripe, Linear)
- Maximalist editorial (Bloomberg, Awwwards winners)
- Retro-futuristic (Y2K revival, vaporwave)
- Organic/natural (earthy, hand-drawn, textured)
- Luxury/refined (fashion houses, premium brands)
- Playful/toy-like (Figma, Notion)
- Neo-brutalist (raw, exposed, intentionally rough)
- Art deco/geometric (bold shapes, gold accents)
- Soft/pastel (gradient meshes, dreamy)
- Industrial/utilitarian (data-dense, functional)

**The Memorability Test:** What ONE thing will users remember? If you can't answer this, the design lacks focus.

---

## 2. Design Token System

Use these systematic values. Never eyeball spacing or pick arbitrary colors.

### Typography Scale
```
--font-size-xs:   0.75rem   /* 12px - captions, labels */
--font-size-sm:   0.875rem  /* 14px - secondary text */
--font-size-base: 1rem      /* 16px - body text (MINIMUM for mobile) */
--font-size-lg:   1.125rem  /* 18px - lead paragraphs */
--font-size-xl:   1.25rem   /* 20px - H4 */
--font-size-2xl:  1.5rem    /* 24px - H3 */
--font-size-3xl:  2rem      /* 32px - H2 */
--font-size-4xl:  2.5rem    /* 40px - H1 */
--font-size-5xl:  3.5rem    /* 56px - Display */
```

**Typography Rules:**
- Line height: 1.5-1.6 for body, 1.1-1.2 for headings
- Line length: 45-75 characters (use `max-w-prose` or `max-w-2xl`)
- Maximum 2-3 typefaces per design
- NEVER use: Inter, Roboto, Arial as primary fonts (overused AI defaults)
- PAIR: One distinctive display font + one refined body font

**Distinctive Font Suggestions:**
- Display: Fraunces, Instrument Serif, Playfair Display, Space Grotesk, Clash Display, Cabinet Grotesk, Satoshi
- Body: Source Serif Pro, IBM Plex Sans, Libre Franklin, Work Sans, Plus Jakarta Sans

### Spacing Scale (8px base)
```
--space-0:  0
--space-1:  0.25rem   /* 4px */
--space-2:  0.5rem    /* 8px */
--space-3:  0.75rem   /* 12px */
--space-4:  1rem      /* 16px */
--space-5:  1.25rem   /* 20px */
--space-6:  1.5rem    /* 24px */
--space-8:  2rem      /* 32px */
--space-10: 2.5rem    /* 40px */
--space-12: 3rem      /* 48px */
--space-16: 4rem      /* 64px */
--space-20: 5rem      /* 80px */
--space-24: 6rem      /* 96px */
--space-32: 8rem      /* 128px - section gaps */
```

**Section Spacing:** 80-120px between major landing page sections.

### Color System
Use HSL for easy dark mode manipulation:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 222 47% 11%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --border: 214 32% 91%;
  --ring: 222 47% 11%;
  --radius: 0.5rem;
}

.dark {
  --background: 222 47% 4%;
  --foreground: 210 40% 98%;
  /* ... invert appropriately */
}
```

**Color Rules:**
- 60-30-10 ratio: 60% dominant, 30% secondary, 10% accent
- ONE bold accent color maximum
- NEVER purple gradients on white (AI cliché)

### Animation Timing
```
--duration-instant: 50ms    /* Immediate feedback */
--duration-fast:    100ms   /* Button clicks, toggles */
--duration-normal:  200ms   /* Most transitions */
--duration-slow:    300ms   /* Modals, drawers */
--duration-slower:  500ms   /* Page transitions */

--ease-default: cubic-bezier(0.4, 0, 0.2, 1)
--ease-in:      cubic-bezier(0.4, 0, 1, 1)      /* Elements exiting */
--ease-out:     cubic-bezier(0, 0, 0.2, 1)      /* Elements entering */
--ease-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Animation Rules:**
- Button feedback: 100-150ms (must feel instantaneous)
- ONLY animate `transform` and `opacity` (GPU accelerated)
- NEVER animate `width`, `height`, `margin`, `padding` (triggers reflow)
- Respect `prefers-reduced-motion`

---

## 3. Accessibility Requirements (Non-Negotiable)

These are HARD requirements, not suggestions.

### Color Contrast (WCAG 2.1 AA)
| Element | Minimum Ratio |
|---------|---------------|
| Body text | 4.5:1 |
| Large text (18pt+ or 14pt bold) | 3:1 |
| UI components, icons | 3:1 |
| Focus indicators | 3:1 |

### Touch Targets
- **Minimum size:** 44×44px (Apple/WCAG) or 48×48dp (Material)
- **Minimum spacing:** 8px between adjacent targets
- Touch target can extend beyond visual boundary via padding

### Interactive Elements
- ALL interactive elements MUST have visible focus states
- NEVER use `outline: none` without a replacement
- Focus indicators must have 3:1 contrast against adjacent colors
- Tab order must be logical (avoid `tabindex` > 0)

### Forms
- Every input MUST have an associated `<label>` (not just placeholder)
- Error messages must be programmatically associated (`aria-describedby`)
- Don't disable submit buttons before user attempts submission
- Use `autocomplete` attributes appropriately

### Images & Icons
- Meaningful images: descriptive `alt` text
- Decorative images: `alt=""`  or `aria-hidden="true"`
- Icon-only buttons: `aria-label` required
- SVG icons: `role="img"` and `aria-label` OR `aria-hidden="true"`

### Semantic HTML
```html
<!-- CORRECT -->
<button type="button">Click me</button>
<a href="/page">Navigate</a>

<!-- WRONG - Never do this -->
<div onclick="...">Click me</div>
<span class="link">Navigate</span>
```

First rule of ARIA: **Don't use ARIA if native HTML works.**

---

## 4. SaaS Dashboard Patterns

### Layout Architecture
```
┌─────────────────────────────────────────────────┐
│ Top Bar (56-64px): Logo, Search, User Menu      │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Main Content Area                   │
│ 240-280px│  (with breadcrumbs if deep nav)     │
│ collapsed│                                      │
│ 64-80px  │  Cards / Data / Forms               │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### Navigation Guidelines
| Scenario | Pattern |
|----------|---------|
| 10+ sections | Collapsible sidebar |
| 3-6 sections | Top navigation |
| Secondary nav | Tabs (max 6) |
| Deep hierarchy | Breadcrumbs |

### Dashboard Content Hierarchy
1. **Value-first metrics:** "You saved 4 hours" > raw numbers
2. **Actionable insights:** What should user do next?
3. **Progressive disclosure:** Summary → Detail on demand
4. **Role-based views:** Different personas need different data

### Data Visualization
- Use semantic colors: red=negative, green=positive (with pattern/icon backup for colorblind)
- Always include legends
- Axis labels are mandatory
- Truncate long labels with tooltips

### Empty States
```jsx
// GOOD: Helpful, action-oriented
<EmptyState
  icon={<InboxIcon />}
  title="No messages yet"
  description="When you receive messages, they'll appear here."
  action={<Button>Compose message</Button>}
/>

// BAD: Unhelpful
<p>No data</p>
```

### Settings Pages
- Bucket + side panel layout for complex settings
- Group destructive actions in "Danger Zone" at bottom
- Destructive confirmations: require typing, specific button labels ("Delete account" not "Yes")

### Toast/Notification Timing
- Default: 4-5 seconds
- Minimum for accessibility: 6 seconds
- Formula: 500ms per word + 3 seconds base
- Always include dismiss button

---

## 5. Landing Page Patterns

### Above-the-Fold Essentials
Must contain within viewport:
1. Clear headline (5-10 words)
2. Supporting subheadline (value proposition)
3. Single primary CTA
4. Visual element (hero image, illustration, or product shot)

### Section Flow
```
1. Hero (headline + CTA + visual)
2. Social Proof (logos, testimonial snippet)
3. Problem/Solution
4. Features/Benefits (3-4 max)
5. Detailed Testimonials
6. Pricing (if applicable)
7. FAQ
8. Final CTA
9. Footer
```

### CTA Button Design
- **Size:** Minimum 44px height, padding 2× font size
- **Color:** High contrast, warm colors create urgency
- **Copy:** Action verbs, first-person ("Get my free trial" > "Sign up")
- **Length:** 2-5 words maximum
- One primary CTA per viewport

### Social Proof Placement
- Logo bar: Immediately after hero
- Testimonials: Near points of objection
- Stats: Near pricing
- Trust badges: Near forms/checkout

### Pricing Tables
- 3-4 tiers maximum (more causes paralysis)
- Highlight recommended tier ("Most Popular")
- Annual/monthly toggle with savings shown
- Checkmarks for quick feature scanning
- CTA button on every tier

### Form Optimization
- Single column layout (120% fewer errors than multi-column)
- Minimize fields (4 fields vs 11 = 120% more conversions)
- Never ask for phone unless essential (58% abandon)
- Labels above inputs
- Validate on blur, not while typing

---

## 6. Tailwind CSS Best Practices

### Required: The cn() Helper
Always use for conditional classes:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<button className={cn(
  "px-4 py-2 rounded-md",
  variant === "primary" && "bg-primary text-white",
  variant === "secondary" && "bg-secondary",
  disabled && "opacity-50 cursor-not-allowed"
)} />
```

### NEVER Use Dynamic Class Names
```typescript
// ❌ BROKEN - Tailwind purges these
const color = "blue";
<div className={`bg-${color}-500`} />

// ✅ CORRECT - Use object maps
const colorMap = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  green: "bg-green-500",
};
<div className={colorMap[color]} />
```

### Component Variants with CVA
```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Responsive Design
Mobile-first approach with Tailwind breakpoints:
```html
<!-- Mobile first: base styles, then layer up -->
<div class="
  flex flex-col          /* Mobile: stack */
  md:flex-row            /* Tablet+: row */
  gap-4 md:gap-8         /* Responsive spacing */
  p-4 md:p-6 lg:p-8      /* Responsive padding */
">
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Dark Mode
```html
<!-- Class-based dark mode (preferred) -->
<div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">

<!-- System preference -->
<html class="dark"> <!-- Toggle this class -->
```

---

## 7. React Component Patterns

### Compound Components
```tsx
// Instead of prop soup:
<Tabs defaultValue="tab1" items={[...]} onChange={...} />

// Use composition:
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Respect Reduced Motion
```tsx
import { useReducedMotion } from "framer-motion";

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    />
  );
}
```

### Loading States
```tsx
// Skeleton screens > spinners
<div className="animate-pulse">
  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
  <div className="h-4 bg-muted rounded w-1/2" />
</div>
```

---

## 8. Anti-Patterns (NEVER DO)

### Visual Anti-Patterns
- ❌ Purple/blue gradients on white (AI cliché)
- ❌ Inter, Roboto, Arial as display fonts
- ❌ Inconsistent border-radius (pick one: 4px, 8px, or 12px)
- ❌ Shadows that don't match light source
- ❌ More than 3 font weights
- ❌ Rainbow color schemes without purpose

### UX Anti-Patterns
- ❌ Confirmshaming ("No thanks, I hate saving money")
- ❌ Pre-selected options benefiting company over user
- ❌ Cancellation harder than signup
- ❌ Fake urgency/scarcity indicators
- ❌ Infinite scroll without pagination option (breaks back button, keyboard nav)
- ❌ Disabled submit buttons before user attempts submission
- ❌ Placeholder text as labels

### Technical Anti-Patterns
- ❌ `outline: none` without focus replacement
- ❌ `<div onclick>` instead of `<button>`
- ❌ Dynamic Tailwind classes (`bg-${color}-500`)
- ❌ Animating layout properties (width, height, margin)
- ❌ Reading layout properties in loops (causes thrashing)
- ❌ Missing `alt` text on images
- ❌ Forms without labels

### Mobile Anti-Patterns
- ❌ Touch targets < 44×44px
- ❌ Body text < 16px
- ❌ Horizontal scrolling on content
- ❌ No tap feedback (must respond < 100ms)
- ❌ Fixed position elements blocking thumb zone

---

## 9. Pre-Delivery Checklist

Before delivering ANY frontend code, verify:

### Accessibility ✓
- [ ] Color contrast ≥ 4.5:1 (text) / 3:1 (UI)
- [ ] Touch targets ≥ 44×44px
- [ ] All images have `alt` text
- [ ] All form fields have `<label>`
- [ ] Visible focus states on all interactive elements
- [ ] No color-only information

### Visual Design ✓
- [ ] Clear typographic hierarchy (3-5 levels)
- [ ] Consistent spacing from token scale
- [ ] Maximum 2-3 typefaces
- [ ] Cohesive color palette (60-30-10)
- [ ] ONE memorable design element

### Technical ✓
- [ ] Mobile-first responsive approach
- [ ] Animations use only transform/opacity
- [ ] No dynamic Tailwind class names
- [ ] Uses `cn()` helper for class merging
- [ ] Dark mode support via CSS variables
- [ ] `prefers-reduced-motion` respected

### UX Integrity ✓
- [ ] Single primary goal per page
- [ ] No dark patterns or confirmshaming
- [ ] Footer always accessible
- [ ] Error states are helpful
- [ ] Loading states exist

---

## 10. Implementation Notes

When generating code:

1. **Start with the design token CSS** - Include the variables at the top
2. **Mobile-first** - Base styles are mobile, layer up with breakpoints
3. **Semantic HTML first** - Use proper elements before adding ARIA
4. **Component composition** - Prefer composition over configuration props
5. **Test the extremes** - Check smallest screen, longest content, empty states

**Remember:** Bold aesthetic choices + systematic execution = memorable interfaces. Generic is the enemy. Commit to a direction and execute with precision.
