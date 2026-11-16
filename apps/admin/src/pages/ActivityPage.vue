<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { apiRequest } from '../composables/useApi'
import PublicProfileLink from '../components/PublicProfileLink.vue'

interface ActivityProfile {
  id: string
  publicName: string
  hasFace: boolean
  isDatingActive: boolean
  lastSeenAt: string
  messagesSent: number
  messagesReceived: number
  likesSent: number
}

interface ActivityResponse {
  profiles: ActivityProfile[]
  total: number
}

const profiles = ref<ActivityProfile[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const hasMore = computed(() => profiles.value.length < total.value)

async function fetchPage(reset: boolean) {
  if (reset) {
    page.value = 1
    loading.value = true
  } else {
    loadingMore.value = true
  }
  error.value = null
  try {
    const res = await apiRequest<ActivityResponse>('/admin/activity', {
      params: { page: page.value, pageSize },
    })
    profiles.value = reset ? res.profiles : [...profiles.value, ...res.profiles]
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'failed to load'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  page.value++
  await fetchPage(false)
}

onMounted(() => {
  fetchPage(true)
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) loadMore()
    },
    { rootMargin: '200px' }
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div>
    <div class="d-flex align-items-baseline mb-4">
      <h2 class="mb-0">Activity</h2>
      <span class="text-muted ms-auto">{{ total }} profile{{ total === 1 ? '' : 's' }}</span>
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="table-container p-3">
      <div
        v-if="loading"
        class="text-muted"
      >
        Loading...
      </div>
      <div
        v-else
        class="table-responsive"
      >
        <table
          class="table table-hover mb-0"
          data-testid="activity"
        >
          <thead>
            <tr>
              <th>Profile</th>
              <th>Last seen</th>
              <th class="text-end">Messages sent</th>
              <th class="text-end">Messages received</th>
              <th class="text-end">Likes sent</th>
              <th class="text-center">Has face</th>
              <th class="text-center">Dating active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="profile in profiles"
              :key="profile.id"
            >
              <td>{{ profile.publicName }}</td>
              <td
                class="text-nowrap"
                :title="profile.lastSeenAt"
              >
                {{ new Date(profile.lastSeenAt).toLocaleString() }}
              </td>
              <td class="text-end">{{ profile.messagesSent }}</td>
              <td class="text-end">{{ profile.messagesReceived }}</td>
              <td class="text-end">{{ profile.likesSent }}</td>
              <td class="text-center">{{ profile.hasFace ? '✓' : '—' }}</td>
              <td class="text-center">{{ profile.isDatingActive ? '✓' : '—' }}</td>
              <td class="text-end">
                <PublicProfileLink :profile-id="profile.id" />
              </td>
            </tr>
            <tr v-if="profiles.length === 0">
              <td
                colspan="8"
                class="text-center text-muted"
              >
                No activity
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        ref="sentinel"
        class="text-center text-muted py-2"
      >
        <span v-if="loadingMore">Loading more...</span>
      </div>
    </div>
  </div>
</template>
