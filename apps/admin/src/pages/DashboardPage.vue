<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { Bar, Pie, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js'

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
)

interface SegmentCount {
  segment: string
  count: number
}

interface Stats {
  totalUsers: number
  totalProfiles: number
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
  dailyLogins: DailyEntry[]
  dailyInteractions: DailyEntry[]
  dailyMatches: DailyEntry[]
  dailyMessages: DailyEntry[]
}

const { call, loading, error } = useApi()
const stats = ref<Stats | null>(null)
const dailyStats = ref<DailyStats | null>(null)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
}

function buildChartData(entries: DailyEntry[], color: string) {
  return {
    labels: entries.map((e) => e.date.slice(5)), // "MM-DD"
    datasets: [
      {
        data: entries.map((e) => e.count),
        backgroundColor: color,
        borderRadius: 4,
      },
    ],
  }
}

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

function buildSegmentPieData(counts: SegmentCount[]) {
  return {
    labels: counts.map((c) => c.segment),
    datasets: [
      {
        data: counts.map((c) => c.count),
        backgroundColor: counts.map((c) => segmentColorMap[c.segment] ?? '#adb5bd'),
      },
    ],
  }
}

function buildLineChartData(entries: DailyEntry[], color: string) {
  return {
    labels: entries.map((e) => e.date.slice(5)),
    datasets: [
      {
        data: entries.map((e) => e.count),
        borderColor: color,
        backgroundColor: color + '33',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  }
}

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
      class="row g-3"
    >
      <div class="col-sm-6 col-lg-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">Total Users</div>
            <div class="kpi-value">{{ stats.totalUsers }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">Total Profiles</div>
            <div class="kpi-value">{{ stats.totalProfiles }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">Active Profiles</div>
            <div class="kpi-value">{{ stats.activeProfiles }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">Signups (Last 7 Days)</div>
            <div class="kpi-value">{{ stats.recentSignups }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">Blocked Users</div>
            <div class="kpi-value">{{ stats.blockedUsers }}</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">Reported Profiles</div>
            <div class="kpi-value">{{ stats.reportedProfiles }}</div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="dailyStats || stats?.segmentCounts?.length"
      class="row g-3 mt-2"
    >
      <div
        v-if="dailyStats"
        class="col-md-4"
      >
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title mb-3">Daily Signups (Last 7 Days)</h6>
            <div style="height: 250px">
              <Bar
                :data="buildChartData(dailyStats.dailySignups, '#0d6efd')"
                :options="chartOptions"
              />
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="dailyStats"
        class="col-md-4"
      >
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title mb-3">Daily Logins (Last 7 Days)</h6>
            <div style="height: 250px">
              <Bar
                :data="buildChartData(dailyStats.dailyLogins, '#198754')"
                :options="chartOptions"
              />
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="stats?.segmentCounts?.length"
        class="col-md-4"
      >
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title mb-3">Activity Segments</h6>
            <div style="height: 250px">
              <Pie
                :data="buildSegmentPieData(stats.segmentCounts)"
                :options="pieOptions"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="dailyStats"
      class="row g-3 mt-2"
    >
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title mb-3">Interactions (Last 7 Days)</h6>
            <div style="height: 250px">
              <Line
                :data="buildLineChartData(dailyStats.dailyInteractions, '#6f42c1')"
                :options="chartOptions"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title mb-3">Matches (Last 7 Days)</h6>
            <div style="height: 250px">
              <Line
                :data="buildLineChartData(dailyStats.dailyMatches, '#d63384')"
                :options="chartOptions"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title mb-3">Messages (Last 7 Days)</h6>
            <div style="height: 250px">
              <Line
                :data="buildLineChartData(dailyStats.dailyMessages, '#fd7e14')"
                :options="chartOptions"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
