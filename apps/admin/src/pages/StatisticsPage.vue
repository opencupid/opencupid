<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import {
  FEW_MATCHES_MAX,
  type AdminStatistics,
  type AdminStatisticsResponse,
  type GenderCounts,
  type StatisticsSegment,
} from '@zod/admin/statistics.dto'
import { ActivitySegmentSchema } from '@zod/generated/inputTypeSchemas/ActivitySegmentSchema'
import { apiRequest } from '../composables/useApi'

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip)

const COLORS = { male: '#2a78d6', female: '#eb6834', other: '#868e96' }
// One hue, light to dark: the match ranges are ordered.
const RANGE_COLORS = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b']

const GENDERS: { key: keyof GenderCounts; label: string }[] = [
  { key: 'male', label: 'Men' },
  { key: 'female', label: 'Women' },
  { key: 'other', label: 'Other or unspecified' },
]
const BINARY = GENDERS.filter((g) => g.key !== 'other') as {
  key: 'male' | 'female'
  label: string
}[]

const TRAIT_LABELS: Record<string, string> = {
  single: 'Single',
  in_relationship: 'In a relationship',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
  other: 'Other',
  unspecified: 'Unspecified',
}
const KIDS_LABELS: Record<string, string> = {
  yes: 'Has children',
  no: 'No children',
  unspecified: 'Children unspecified',
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
}

const stats = ref<AdminStatistics | null>(null)
const origin = ref('')
const segment = ref<'' | StatisticsSegment>('')
const mode = ref<'count' | 'share'>('count')
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await apiRequest<AdminStatisticsResponse>('/admin/statistics', {
      params: { origin: origin.value || undefined, segment: segment.value || undefined },
    })
    stats.value = res.statistics
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const sum = (counts: GenderCounts) => counts.male + counts.female + counts.other
const percent = (value: number, total: number) => (total === 0 ? 0 : (value / total) * 100)
const formatPercent = (value: number, total: number) =>
  total === 0 ? '—' : `${Math.round(percent(value, total))}%`

const cards = computed(() => {
  const s = stats.value
  if (!s) return []
  const { total, social, dating, hidden } = s.profiles
  const age = s.dating.medianAge
  return [
    { title: 'Profiles', value: total, note: `${social} on social` },
    { title: 'Dating', value: dating, note: `${formatPercent(dating, total)} of profiles` },
    {
      title: 'Median age, dating',
      value: age.all ?? '—',
      note: `Women ${age.female ?? '—'}, men ${age.male ?? '—'}`,
    },
    {
      title: 'Few matches',
      value: s.pool.fewMatches,
      note: `of ${sum(s.pool.gender)} have ${FEW_MATCHES_MAX} or fewer`,
    },
    {
      title: 'Hidden from results',
      value: hidden,
      note: `${formatPercent(hidden, total)} of profiles`,
    },
  ]
})

// --- Dating population ---

const agedCount = computed(() =>
  (stats.value?.dating.ageBands ?? []).reduce((n, b) => n + sum(b), 0)
)

const pyramidTotals = computed(() => {
  const bands = stats.value?.dating.ageBands ?? []
  return {
    male: bands.reduce((n, b) => n + b.male, 0),
    female: bands.reduce((n, b) => n + b.female, 0),
  }
})

function pyramidValue(gender: 'male' | 'female', count: number) {
  return mode.value === 'share' ? percent(count, pyramidTotals.value[gender]) : count
}

const pyramidData = computed(() => {
  const bands = stats.value?.dating.ageBands ?? []
  return {
    labels: bands.map((b) => b.band),
    datasets: BINARY.map(({ key, label }) => ({
      label,
      backgroundColor: COLORS[key],
      borderRadius: 4,
      // Men extend to the left of zero.
      data: bands.map((b) => (key === 'male' ? -1 : 1) * pyramidValue(key, b[key])),
    })),
  }
})

const pyramidOptions = computed(() => {
  const max = Math.max(1, ...pyramidData.value.datasets.flatMap((d) => d.data.map(Math.abs)))
  const unit = mode.value === 'share' ? '%' : ''
  return {
    ...baseOptions,
    indexAxis: 'y' as const,
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'bar'>) => {
            const { key, label } = BINARY[item.datasetIndex]!
            const count = stats.value!.dating.ageBands[item.dataIndex]![key]
            return `${label}: ${count} (${formatPercent(count, pyramidTotals.value[key])})`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        suggestedMin: -max,
        suggestedMax: max,
        ticks: {
          precision: 0,
          callback: (value: string | number) => `${Math.abs(Number(value))}${unit}`,
        },
      },
      y: { stacked: true, reverse: true, grid: { display: false } },
    },
  }
})

const genderRows = computed(() => {
  const gender = stats.value?.dating.gender
  if (!gender) return []
  return GENDERS.map(({ key, label }) => ({
    key,
    label,
    count: gender[key],
    share: formatPercent(gender[key], sum(gender)),
  }))
})

const traits = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    ...s.dating.relationship.map((r) => ({ ...r, label: TRAIT_LABELS[r.value] ?? r.value })),
    ...s.dating.hasKids.map((k) => ({ ...k, label: KIDS_LABELS[k.value] ?? k.value })),
  ].filter((t) => t.male + t.female > 0)
})

const traitData = computed(() => ({
  labels: traits.value.map((t) => t.label),
  datasets: BINARY.map(({ key, label }) => ({
    label,
    backgroundColor: COLORS[key],
    borderRadius: 4,
    data: traits.value.map((t) => percent(t[key], stats.value!.dating.gender[key])),
  })),
}))

const traitOptions = computed(() => ({
  ...baseOptions,
  indexAxis: 'y' as const,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      callbacks: {
        label: (item: TooltipItem<'bar'>) => {
          const { key, label } = BINARY[item.datasetIndex]!
          const count = traits.value[item.dataIndex]![key]
          return `${label}: ${count} (${formatPercent(count, stats.value!.dating.gender[key])})`
        },
      },
    },
  },
  scales: {
    x: { beginAtZero: true, ticks: { callback: (value: string | number) => `${value}%` } },
    y: { grid: { display: false } },
  },
}))

// --- Dating pool ---

const poolData = computed(() => {
  const bands = stats.value?.pool.ageBands ?? []
  return {
    labels: bands.map((b) => b.band),
    datasets: BINARY.map(({ key, label }) => ({
      label,
      borderColor: COLORS[key],
      backgroundColor: COLORS[key],
      borderWidth: 2,
      pointRadius: 5,
      data: bands.map((b) => b[key].median),
    })),
  }
})

const poolOptions = computed(() => ({
  ...baseOptions,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      callbacks: {
        label: (item: TooltipItem<'line'>) => {
          const { key, label } = BINARY[item.datasetIndex]!
          const group = stats.value!.pool.ageBands[item.dataIndex]![key]
          return `${label}: ${group.median} (n = ${group.count})`
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, title: { display: true, text: 'Median matches' } },
  },
}))

const distributionGenders = computed(() =>
  GENDERS.filter(({ key }) => (stats.value?.pool.gender[key] ?? 0) > 0)
)

const distributionData = computed(() => {
  const pool = stats.value?.pool
  return {
    labels: distributionGenders.value.map((g) => `${g.label} (${pool!.gender[g.key]})`),
    datasets: (pool?.distribution ?? []).map((row, i) => ({
      label: row.range,
      backgroundColor: RANGE_COLORS[i],
      borderColor: '#fff',
      borderWidth: 1,
      maxBarThickness: 28,
      data: distributionGenders.value.map((g) => percent(row[g.key], pool!.gender[g.key])),
    })),
  }
})

const distributionOptions = computed(() => ({
  ...baseOptions,
  indexAxis: 'y' as const,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      callbacks: {
        label: (item: TooltipItem<'bar'>) => {
          const { key } = distributionGenders.value[item.dataIndex]!
          const row = stats.value!.pool.distribution[item.datasetIndex]!
          const total = stats.value!.pool.gender[key]
          return `${row.range} matches: ${row[key]} (${formatPercent(row[key], total)})`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      max: 100,
      ticks: { callback: (value: string | number) => `${value}%` },
    },
    y: { stacked: true, grid: { display: false } },
  },
}))
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-items-end gap-3 mb-4">
      <div class="me-auto">
        <h2 class="mb-0">Statistics</h2>
        <div class="text-body-secondary small">Active, onboarded, unblocked profiles</div>
      </div>
      <select
        v-model="origin"
        class="form-select w-auto"
        aria-label="Filter by brand"
        data-testid="origin"
        :disabled="loading"
        @change="load"
      >
        <option value="">All brands</option>
        <option
          v-for="domain in stats?.origins ?? []"
          :key="domain"
          :value="domain"
        >
          {{ domain }}
        </option>
      </select>
      <select
        v-model="segment"
        class="form-select w-auto"
        aria-label="Filter by activity"
        data-testid="segment"
        :disabled="loading"
        @change="load"
      >
        <option value="">All activity</option>
        <option
          v-for="value in ActivitySegmentSchema.options"
          :key="value"
          :value="value"
          class="text-capitalize"
        >
          {{ value }}
        </option>
      </select>
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>
    <div
      v-if="loading && !stats"
      class="text-muted"
    >
      Loading...
    </div>

    <div
      v-if="stats"
      :class="{ 'opacity-50': loading }"
    >
      <div class="stat-grid mb-4">
        <div
          v-for="card in cards"
          :key="card.title"
          class="card kpi-card"
          data-testid="card"
        >
          <div class="card-body">
            <h6 class="card-title mb-1">{{ card.title }}</h6>
            <div class="kpi-value">{{ card.value }}</div>
            <div class="text-body-secondary small">{{ card.note }}</div>
          </div>
        </div>
      </div>

      <h4 class="mb-3">Dating population</h4>
      <div class="row g-3 mb-4">
        <div class="col-lg-6">
          <div class="card kpi-card h-100">
            <div class="card-body">
              <div class="d-flex align-items-start mb-2">
                <h6 class="card-title mb-0 me-auto">Age and gender</h6>
                <div class="btn-group btn-group-sm">
                  <button
                    v-for="option in ['count', 'share'] as const"
                    :key="option"
                    type="button"
                    class="btn btn-outline-secondary text-capitalize"
                    :class="{ active: mode === option }"
                    :aria-pressed="mode === option"
                    :data-testid="`mode-${option}`"
                    @click="mode = option"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
              <div
                class="chart-pyramid"
                role="img"
                aria-label="Dating profiles by age and gender, see the table below"
              >
                <Bar
                  :data="pyramidData"
                  :options="pyramidOptions"
                />
              </div>
              <p class="text-body-secondary small mt-2 mb-2">
                n = {{ agedCount }} dating profiles. Other genders are in the table.
              </p>
              <details>
                <summary>Show as table</summary>
                <table
                  class="table table-sm mb-0"
                  data-testid="age-table"
                >
                  <thead>
                    <tr>
                      <th>Age</th>
                      <th
                        v-for="g in GENDERS"
                        :key="g.key"
                        class="text-end"
                      >
                        {{ g.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="b in stats.dating.ageBands"
                      :key="b.band"
                    >
                      <td>{{ b.band }}</td>
                      <td
                        v-for="g in GENDERS"
                        :key="g.key"
                        class="text-end"
                      >
                        {{ b[g.key] }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </details>
            </div>
          </div>
        </div>

        <div class="col-lg-6 d-flex flex-column gap-3">
          <div class="card kpi-card">
            <div class="card-body">
              <h6 class="card-title">Gender</h6>
              <table
                class="table table-sm mb-0"
                data-testid="gender-table"
              >
                <tbody>
                  <tr
                    v-for="row in genderRows"
                    :key="row.key"
                  >
                    <td>
                      <span
                        class="swatch"
                        :style="{ backgroundColor: COLORS[row.key] }"
                        aria-hidden="true"
                      />
                      {{ row.label }}
                    </td>
                    <td class="text-end">{{ row.count }}</td>
                    <td class="text-end">{{ row.share }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card kpi-card flex-grow-1">
            <div class="card-body">
              <h6 class="card-title">Relationship and children</h6>
              <div class="text-body-secondary small mb-2">Share of each gender</div>
              <div
                class="chart-tall"
                role="img"
                :aria-label="`Relationship status and children by gender. ${traits
                  .map((t) => `${t.label}: ${t.male} men, ${t.female} women`)
                  .join('. ')}`"
              >
                <Bar
                  :data="traitData"
                  :options="traitOptions"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <h4 class="mb-1">Dating pool</h4>
      <p class="text-body-secondary small">
        Mutual matches per person by age, gender and children preferences, at any distance. Hidden
        profiles are excluded. Filters pick whose matches are counted; candidates come from the
        whole site.
      </p>
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card kpi-card h-100">
            <div class="card-body">
              <h6 class="card-title">Typical number of matches by age</h6>
              <div
                class="chart"
                role="img"
                aria-label="Median mutual matches by age and gender, see the table below"
              >
                <Line
                  :data="poolData"
                  :options="poolOptions"
                />
              </div>
              <details class="mt-2">
                <summary>Show as table</summary>
                <table
                  class="table table-sm mb-0"
                  data-testid="pool-table"
                >
                  <thead>
                    <tr>
                      <th>Age</th>
                      <template
                        v-for="g in BINARY"
                        :key="g.key"
                      >
                        <th class="text-end">{{ g.label }}, median</th>
                        <th class="text-end">n</th>
                      </template>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="b in stats.pool.ageBands"
                      :key="b.band"
                    >
                      <td>{{ b.band }}</td>
                      <template
                        v-for="g in BINARY"
                        :key="g.key"
                      >
                        <td class="text-end">{{ b[g.key].median ?? '—' }}</td>
                        <td class="text-end">{{ b[g.key].count }}</td>
                      </template>
                    </tr>
                  </tbody>
                </table>
              </details>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card kpi-card h-100">
            <div class="card-body">
              <h6 class="card-title">How many matches people have</h6>
              <div class="text-body-secondary small mb-2">Share of each gender</div>
              <div
                class="chart"
                role="img"
                :aria-label="`People by number of matches. ${stats.pool.distribution
                  .map((r) => `${r.range}: ${r.male} men, ${r.female} women, ${r.other} other`)
                  .join('. ')}`"
              >
                <Bar
                  :data="distributionData"
                  :options="distributionOptions"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.chart {
  height: 18rem;
}

.chart-pyramid {
  height: 28rem;
}

.chart-tall {
  height: 22rem;
}

.swatch {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  margin-right: 0.5rem;
  border-radius: 2px;
}
</style>
