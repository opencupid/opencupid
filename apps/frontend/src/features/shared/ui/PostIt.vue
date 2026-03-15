<script setup lang="ts">
defineProps({
  variant: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    required: true,
  },
})

/** Small seeded PRNG so the warp is stable per id */
function seedRand(seed: string) {
  // xmur3 + mulberry32 (tiny, deterministic)
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function mulberry32() {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function warpStyle(id: string) {
  const r = seedRand(id)
  // helper to map [0,1) -> [-a, +a]
  const span = (a: number) => (r() * 2 - 1) * a

  const rot = span(2.2) // deg
  const rx = span(3) // deg
  const ry = span(3) // deg
  const skx = span(0.4) // deg
  const skv = 0.6 + r() * 0.8 // 0.6..1.4 intensity

  return {
    '--rot': `${rot}deg`,
    '--rx': `${rx}deg`,
    '--ry': `${ry}deg`,
    '--skx': `${skx}deg`,
    '--skv': skv.toString(),
    '--shadow': (0.1 + r() * 0.06).toString(),
  } as Record<string, string>
}
</script>
<template>
  <div
    class="post-it-wrapper"
    :style="warpStyle(id)"
  >
    <div
      class="post-it"
      :class="variant"
    >
      <div class="header mb-2">
        <slot name="header"></slot>
        <div class="pin-marker"></div>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.o-post-it {
  background-color: var(--postit-bg); /* Default yellow */
  border: 1px solid var(--bs-border-color);
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
  width: 100%;
  min-height: 150px;
}

/* Wrapper holds transform + shadow so clip-path on inner doesn't clip the shadow */
.post-it-wrapper {
  --rot: 0deg;
  --rx: 0deg;
  --ry: 0deg;
  --skx: 0deg;
  --skv: 0;
  --shadow: 0.12;

  width: 100%;
  min-height: 150px;
  position: relative;
  transform-origin: 50% 45%;
  transform: perspective(900px) rotate(var(--rot)) rotateX(var(--rx)) rotateY(var(--ry))
    skewX(var(--skx));
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1)) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.08));
  transition: filter 150ms ease;

  &:hover {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.14)) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.12));
  }
}

.post-it {
  background: var(--postit-bg);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.8rem 0.9rem;
  position: relative;

  /* very subtle noise so it’s less “flat” */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;

    mix-blend-mode: multiply;
    opacity: 0.6;
    border-radius: inherit;
  }

  /* curled edges illusion (left & right) */
  &::before {
    content: '';
    position: absolute;
    inset: -2px -2px -8px -2px; /* a hair larger for feather */
    pointer-events: none;

    filter: blur(0.5px);
    border-radius: inherit;
  }

  /* optional: slightly wonky outline like hand-cut paper */
  clip-path: polygon(
    calc(0% + 0.2% * var(--skv)) calc(0% + 0.5% * var(--skv)),
    calc(100% - 0.4% * var(--skv)) 0%,
    100% calc(100% - 0.4% * var(--skv)),
    0% calc(100% - 0.2% * var(--skv))
  );
}

.header {
  position: relative;
}

/* simple round pin/dent */
.pin-marker {
  position: absolute;
  top: 0.3rem;
  left: 0.3rem;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #000 0 35%, transparent 36%);
  opacity: 0.12;
  filter: blur(1px);
  pointer-events: none;
}

/* end warp */

.accent {
  background-color: var(--postit-bg-alt);
}
.content {
  white-space: pre-wrap; /* Preserves whitespace and line breaks */
  overflow: hidden;
}
</style>
