<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import { useApi } from '../composables/useApi'

type Metric = 'interactions' | 'messages'
type Range = '24h' | '72h' | '7d'

interface Props {
  metric: Metric
  title: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

interface BucketEntry {
  bucket: string
  count: number
}
interface Series {
  key: string
  label: string
  data: BucketEntry[]
}
interface Breakdown {
  success: boolean
  metric: Metric
  range: Range
  unit: 'hour' | 'day'
  buckets: string[]
  series: Series[]
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '72h', label: 'Last 72 hours' },
  { value: '7d', label: 'Last 7 days' },
]

const SERIES_COLORS: Record<string, string> = {
  likes: '#6f42c1',
  anonymous: '#adb5bd',
  matches: '#d63384',
  messages: '#fd7e14',
  conversations: '#0d6efd',
}

const range = ref<Range>('72h')
const breakdown = ref<Breakdown | null>(null)
const { call, loading, error } = useApi()

async function load() {
  const res = await call<Breakdown>('/admin/stats/breakdown', {
    params: { metric: props.metric, range: range.value },
  })
  if (res) breakdown.value = res
}

watch(() => [props.metric, range.value], load, { immediate: true })

function formatLabel(iso: string, unit: 'hour' | 'day'): string {
  const d = new Date(iso)
  if (unit === 'day') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const labels = computed(() => {
  const b = breakdown.value
  if (!b) return [] as string[]
  return b.buckets.map((iso) => formatLabel(iso, b.unit))
})

function chartData(series: Series) {
  return {
    labels: labels.value,
    datasets: [
      {
        label: series.label,
        data: series.data.map((d) => d.count),
        backgroundColor: SERIES_COLORS[series.key] ?? '#0d6efd',
      },
    ],
  }
}

const chartOptions = computed(() => {
  const unit = breakdown.value?.unit ?? 'hour'
  const labelCount = labels.value.length
  // Avoid axis crowding: show ~8 ticks regardless of bucket count.
  const stride = Math.max(1, Math.ceil(labelCount / 8))
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          callback(_value: unknown, index: number) {
            return index % stride === 0 ? labels.value[index] : ''
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
    // Reference unit so the option object recomputes per range.
    _unit: unit,
  } as any
})

function onClose() {
  emit('close')
}
</script>

<template>
  <div
    class="modal d-block"
    tabindex="-1"
    @click.self="onClose"
    @keydown.escape="onClose"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <select
            v-model="range"
            class="form-select form-select-sm w-auto ms-3"
            data-test="range-select"
            aria-label="Time range"
          >
            <option
              v-for="opt in RANGE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <button
            type="button"
            class="btn-close ms-auto"
            aria-label="Close"
            @click="onClose"
          ></button>
        </div>
        <div class="modal-body">
          <div
            v-if="error"
            class="alert alert-danger"
          >
            {{ error }}
          </div>
          <div
            v-if="loading && !breakdown"
            class="text-muted"
          >
            Loading...
          </div>
          <div
            v-if="breakdown"
            class="d-flex flex-column gap-4"
          >
            <div
              v-for="series in breakdown.series"
              :key="series.key"
              class="drilldown-series"
            >
              <div class="d-flex justify-content-between align-items-baseline mb-2">
                <h6 class="mb-0">{{ series.label }}</h6>
                <span class="text-body-secondary small">
                  Total: {{ series.data.reduce((sum, d) => sum + d.count, 0) }}
                </span>
              </div>
              <div class="drilldown-chart">
                <Bar
                  :data="chartData(series)"
                  :options="chartOptions"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="onClose"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop show"></div>
</template>

<style scoped>
.drilldown-chart {
  height: 12rem;
}
</style>
