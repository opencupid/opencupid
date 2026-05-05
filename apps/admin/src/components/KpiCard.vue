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
    <div class="card-body kpi-body">
      <div class="kpi-text">
        <h6 class="card-title mb-0">{{ title }}</h6>
        <div class="kpi-subtitle text-body-secondary">
          {{ subtitle || '\xa0' }}
        </div>
        <div class="kpi-value">{{ value }}</div>
      </div>
      <div
        v-if="series.length"
        class="kpi-spark"
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
.kpi-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: end;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.kpi-text {
  min-width: 0;
}

.kpi-subtitle {
  font-size: 0.75rem;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
}

.kpi-spark {
  height: 2.25rem;
  width: 100%;
  justify-self: end;
}

.kpi-spark svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
