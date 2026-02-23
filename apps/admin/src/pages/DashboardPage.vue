<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'

interface Stats {
  totalUsers: number
  totalProfiles: number
  activeProfiles: number
  recentSignups: number
  blockedUsers: number
  reportedProfiles: number
}

const { call, loading, error } = useApi()
const stats = ref<Stats | null>(null)

onMounted(async () => {
  const res = await call<{ success: boolean; stats: Stats }>('/api/admin/stats')
  if (res) stats.value = res.stats
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
  </div>
</template>
