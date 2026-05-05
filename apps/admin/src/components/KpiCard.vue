<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  subtitle?: string
  value: number | string
  series?: number[]
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  series: () => [],
  color: '#0d6efd',
})

const VIEW_W = 100
const VIEW_H = 32
const GAP_RATIO = 0.25

const bars = computed(() => {
  if (!props.series.length) return []
  const max = Math.max(1, ...props.series)
  const slot = VIEW_W / props.series.length
  const barW = slot * (1 - GAP_RATIO)
  return props.series.map((v, i) => {
    const h = (v / max) * VIEW_H
    return {
      x: i * slot + (slot - barW) / 2,
      y: VIEW_H - h,
      width: barW,
      height: h,
    }
  })
})
</script>

<template>
  <div class="card kpi-card h-100">
    <div class="card-body d-flex flex-column">
      <h6 class="card-title mb-1">{{ title }}</h6>
      <h6 class="card-subtitle mb-2 text-body-secondary small">
        {{ subtitle || '\xa0' }}
      </h6>
      <div class="kpi-value">{{ value }}</div>
      <div
        v-if="series.length"
        class="kpi-spark mt-auto"
      >
        <svg
          :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
          preserveAspectRatio="none"
          aria-hidden="true"
          role="presentation"
        >
          <rect
            v-for="(bar, i) in bars"
            :key="i"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="color"
            rx="0.5"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  min-height: 8rem;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-spark {
  height: 2.5rem;
  width: 100%;
}

.kpi-spark svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
