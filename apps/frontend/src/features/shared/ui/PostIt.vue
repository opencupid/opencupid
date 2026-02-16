<template>
  <div class="post-it" :class="variant" :style="warpStyle(id)">
    <div class="header mb-2">
      <slot name="header"></slot>
      <div class="pin-marker"></div>
    </div>
    <div class="content fs-4">
      <slot></slot>
    </div>
  </div>
</template>

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

<style scoped lang="scss">
.post-it .content {
  font-family: 'Reenie Beanie', cursive;
  line-height: 1.25;
}

.o-post-it {
  background-color: #ffffcc; /* Default yellow */
  /* padding: 0.5rem; */
  border: 1px solid #ccc;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
  /* display: inline-block; */
  /* margin: 0.25rem; */
  width: 100%; /* Example width */
  min-height: 150px; /* Example minimum height */
  /* transform: rotate(3deg);  */
}



/* PostIt.vue (scoped or global) */
.post-it {
  --rot: 0deg; /* overall rotation */
  --rx: 0deg; /* perspective tilt X */
  --ry: 0deg; /* perspective tilt Y */
  --skx: 0deg; /* tiny skew */
  --skv: 0; /* 0..1, controls edge warp strength */
  --shadow: 0.12; /* base shadow opacity */

  width: 100%; /* Example width */
  min-height: 150px;

  background: #fff587;
  border-radius: 10px;
  padding: 14px 16px 18px;
  position: relative;
  transform-origin: 50% 45%;
  /* slight perspective + micro skew for “warped paper” feel */
  transform: perspective(900px) rotate(var(--rot)) rotateX(var(--rx)) rotateY(var(--ry))
    skewX(var(--skx));

  /* layered soft shadows (paper on board) */
  box-shadow:
    0 1.5px 0 rgba(0, 0, 0, calc(var(--shadow) * 0.7)),
    0 12px 18px -8px rgba(0, 0, 0, calc(var(--shadow))),
    0 30px 35px -26px rgba(0, 0, 0, calc(var(--shadow)));

  /* very subtle noise so it’s less “flat” */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        120% 80% at 0% 0%,
        rgba(0, 0, 0, calc(0.06 * var(--skv))) 0%,
        transparent 50%
      ),
      radial-gradient(
        120% 80% at 100% 100%,
        rgba(0, 0, 0, calc(0.06 * var(--skv))) 0%,
        transparent 55%
      );
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
    background:
      radial-gradient(
        100% 20px at 50% 0%,
        rgba(0, 0, 0, calc(0.12 * var(--skv))) 0,
        rgba(0, 0, 0, 0) 70%
      ),
      radial-gradient(
        100% 16px at 0% 50%,
        rgba(0, 0, 0, calc(0.08 * var(--skv))) 0,
        rgba(0, 0, 0, 0) 65%
      ),
      radial-gradient(
        100% 16px at 100% 50%,
        rgba(0, 0, 0, calc(0.08 * var(--skv))) 0,
        rgba(0, 0, 0, 0) 65%
      ),
      radial-gradient(
        100% 22px at 50% 100%,
        rgba(0, 0, 0, calc(0.1 * var(--skv))) 0,
        rgba(0, 0, 0, 0) 75%
      );
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

.post-it {
  position: relative;
}

.header {
  position: relative;
  font-family: var(--bs-body-font-family, sans-serif);
}

/* simple round pin/dent */
.pin-marker {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #000 0 35%, transparent 36%);
  opacity: 0.12;
  filter: blur(1px);
  pointer-events: none;
}

/* end warp */

.accent {
  background-color: #f9f586; /* Accent color */
}
.content {
  white-space: pre-wrap; /* Preserves whitespace and line breaks */
  overflow: hidden;
}
</style>
