<script setup lang="ts">
import { computed } from 'vue'

export interface KpiStack {
  /** Segment name used in the hover title, e.g. "sent". */
  label: string
  values: number[]
}

interface Props {
  title: string
  subtitle?: string
  value: number | string
  series?: number[]
  /**
   * Stacked alternative to `series`: one entry per segment, bottom first, each
   * with one value per bar. The first segment is drawn solid, the rest lighter.
   */
  stacks?: KpiStack[]
  /** Per-bar hover labels (e.g. dates), parallel to the bars. */
  seriesLabels?: string[]
  color?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  series: () => [],
  stacks: () => [],
  seriesLabels: () => [],
  color: '#0d6efd',
  clickable: false,
})

const VIEW_W = 100
const VIEW_H = 32
const GAP_RATIO = 0.25
const SECONDARY_OPACITY = 0.4

const layers = computed<KpiStack[]>(() =>
  props.stacks.length ? props.stacks : [{ label: '', values: props.series }]
)

const bars = computed(() => {
  const n = Math.max(0, ...layers.value.map((l) => l.values.length))
  if (!n) return []
  // columns[i][j]: value of segment j in bar i (a ragged stack counts as 0)
  const columns = Array.from({ length: n }, (_, i) => layers.value.map((l) => l.values[i] ?? 0))
  const max = Math.max(1, ...columns.map((c) => c.reduce((a, b) => a + b, 0)))
  const slot = VIEW_W / n
  const barW = slot * (1 - GAP_RATIO)
  return columns.map((column, i) => {
    let base = VIEW_H
    const segments = column.map((v, j) => {
      const h = (v / max) * VIEW_H
      base -= h
      return { y: base, height: h, opacity: j === 0 ? 1 : SECONDARY_OPACITY }
    })
    const label = props.seriesLabels[i]
    const parts = props.stacks.length
      ? column.map((v, j) => `${v} ${props.stacks[j]?.label}`).join(' · ')
      : String(column[0])
    return {
      x: i * slot + (slot - barW) / 2,
      width: barW,
      segments,
      title: label ? `${label}: ${parts}` : '',
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
        v-if="bars.length"
        class="kpi-spark"
      >
        <svg
          :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
          preserveAspectRatio="none"
          aria-hidden="true"
          role="presentation"
        >
          <g
            v-for="(bar, i) in bars"
            :key="i"
          >
            <title v-if="bar.title">{{ bar.title }}</title>
            <rect
              v-for="(seg, j) in bar.segments"
              :key="j"
              :x="bar.x"
              :y="seg.y"
              :width="bar.width"
              :height="seg.height"
              :fill="color"
              :fill-opacity="seg.opacity"
              rx="0.5"
            />
          </g>
          <line
            x1="0"
            :y1="VIEW_H"
            :x2="VIEW_W"
            :y2="VIEW_H"
            :stroke="color"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
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
