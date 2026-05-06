<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  subtitle?: string
  value: number | string
  series?: number[]
  color?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  series: () => [],
  color: '#0d6efd',
  clickable: false,
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
  <div
    class="card kpi-card h-100 pt-3"
    :class="{ 'kpi-card-clickable': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
  >
    <div class="card-body kpi-body">
      <div class="kpi-text w-100">
        <h6 class="card-title mb-1">{{ title }}</h6>
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
.card-body.kpi-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: end;
  gap: 0.75rem;
  padding: 0;
}

.kpi-text {
  min-width: 0;
  margin: 0 0.5rem 0.5rem 1rem;
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
  height: 80%;
  width: 100%;
  justify-self: end;
  background: var(--bs-secondary-light);
}

.kpi-spark svg {
  width: 100%;
  height: 100%;
  display: block;
}

.kpi-card-clickable {
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.kpi-card-clickable:hover,
.kpi-card-clickable:focus-visible {
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
</style>
