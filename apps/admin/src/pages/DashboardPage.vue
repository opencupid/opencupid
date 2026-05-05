<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import KpiCard from '../components/KpiCard.vue'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement)

interface SegmentCount {
  segment: string
  count: number
}

interface Stats {
  activeProfiles: number
  recentSignups: number
  blockedUsers: number
  reportedProfiles: number
  segmentCounts: SegmentCount[]
}

interface DailyEntry {
  date: string
  count: number
}

interface DailyStats {
  success: boolean
  dailySignups: DailyEntry[]
  dailyLastSeen: DailyEntry[]
  dailyBlockedUsers: DailyEntry[]
  dailyReportedProfiles: DailyEntry[]
  dailyInteractions: DailyEntry[]
  dailyMatches: DailyEntry[]
  dailyMessages: DailyEntry[]
}

const { call, loading, error } = useApi()
const stats = ref<Stats | null>(null)
const dailyStats = ref<DailyStats | null>(null)

const series = (rows: DailyEntry[] | undefined) => (rows ? rows.map((r) => r.count) : [])

const dailyActiveTotal = computed(() =>
  (dailyStats.value?.dailyLastSeen ?? []).reduce((sum, r) => sum + r.count, 0)
)
const interactionsTotal = computed(() =>
  (dailyStats.value?.dailyInteractions ?? []).reduce((sum, r) => sum + r.count, 0)
)
const matchesTotal = computed(() =>
  (dailyStats.value?.dailyMatches ?? []).reduce((sum, r) => sum + r.count, 0)
)
const messagesTotal = computed(() =>
  (dailyStats.value?.dailyMessages ?? []).reduce((sum, r) => sum + r.count, 0)
)

const segmentColorMap: Record<string, string> = {
  new: '#0d6efd',
  returning: '#198754',
  frequent: '#0dcaf0',
  dormant: '#6c757d',
}

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
}

const segmentPieData = computed(() => {
  const counts = stats.value?.segmentCounts ?? []
  return {
    labels: counts.map((c) => c.segment),
    datasets: [
      {
        data: counts.map((c) => c.count),
        backgroundColor: counts.map((c) => segmentColorMap[c.segment] ?? '#adb5bd'),
      },
    ],
  }
})

onMounted(async () => {
  const [statsRes, dailyRes] = await Promise.all([
    call<{ success: boolean; stats: Stats }>('/admin/stats'),
    call<DailyStats>('/admin/stats/daily'),
  ])
  if (statsRes) stats.value = statsRes.stats
  if (dailyRes) dailyStats.value = dailyRes
})
</script>

<template>
  <div>
    <h2 class="mb-4">Dashboard</h2>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="text-muted"
    >
      Loading...
    </div>

    <div
      v-if="stats"
      class="kpi-grid"
    >
      <KpiCard
        title="Signups"
        subtitle="Last 7 Days"
        :value="stats.recentSignups"
        :series="series(dailyStats?.dailySignups)"
        color="#0d6efd"
      />
      <KpiCard
        title="Daily Active"
        subtitle="Last 7 Days"
        :value="dailyActiveTotal"
        :series="series(dailyStats?.dailyLastSeen)"
        color="#198754"
      />
      <KpiCard
        title="Blocked Users"
        subtitle="Total"
        :value="stats.blockedUsers"
        :series="series(dailyStats?.dailyBlockedUsers)"
        color="#dc3545"
      />
      <KpiCard
        title="Reported Profiles"
        subtitle="Total"
        :value="stats.reportedProfiles"
        :series="series(dailyStats?.dailyReportedProfiles)"
        color="#fd7e14"
      />
      <KpiCard
        title="Interactions"
        subtitle="Last 7 Days"
        :value="interactionsTotal"
        :series="series(dailyStats?.dailyInteractions)"
        color="#6f42c1"
      />
      <KpiCard
        title="Matches"
        subtitle="Last 7 Days"
        :value="matchesTotal"
        :series="series(dailyStats?.dailyMatches)"
        color="#d63384"
      />
      <KpiCard
        title="Messages"
        subtitle="Last 7 Days"
        :value="messagesTotal"
        :series="series(dailyStats?.dailyMessages)"
        color="#fd7e14"
      />
    </div>

    <div
      v-if="stats?.segmentCounts?.length"
      class="row g-3 mt-3"
    >
      <div class="col-md-6 col-lg-4">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title mb-1">Activity Segments</h6>
            <h6 class="card-subtitle mb-2 text-body-secondary small">Current</h6>
            <div class="segment-chart">
              <Pie
                :data="segmentPieData"
                :options="pieOptions"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 576px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 992px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.segment-chart {
  height: 14rem;
}
</style>
