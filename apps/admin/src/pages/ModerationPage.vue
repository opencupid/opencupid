<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listTrustFlags,
  clearTrustFlag,
  type TrustFlagRow,
  type TrustReason,
} from '../composables/useTrustFlags'

const router = useRouter()

const flags = ref<TrustFlagRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const includeCleared = ref(false)
const reasonFilter = ref<'' | TrustReason>('')

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const hasMore = computed(() => flags.value.length < total.value)

async function fetchFlags(reset = true) {
  if (reset) {
    page.value = 1
  }
  if (reset) loading.value = true
  else loadingMore.value = true
  error.value = null
  try {
    const res = await listTrustFlags({
      page: page.value,
      pageSize,
      activeOnly: !includeCleared.value,
      reason: reasonFilter.value || undefined,
    })
    flags.value = reset ? res.flags : [...flags.value, ...res.flags]
    total.value = res.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'failed to load'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  page.value++
  fetchFlags(false)
}

function isAdminFlag(f: TrustFlagRow) {
  return f.flaggedBy.startsWith('admin:')
}

function reasonBadgeClass(f: TrustFlagRow) {
  if (f.flaggedBy.startsWith('admin:')) return 'badge bg-danger'
  if (f.flaggedBy.startsWith('heuristic:')) return 'badge bg-warning text-dark'
  return 'badge bg-secondary'
}

function evidenceSummary(f: TrustFlagRow) {
  const e = f.evidence as Record<string, unknown> | null
  if (!e) return '—'
  if (typeof e.note === 'string') {
    return e.note.length > 60 ? e.note.slice(0, 60) + '…' : e.note
  }
  if (typeof e.countAtFlagTime === 'number') return `count=${e.countAtFlagTime}`
  if (typeof e.source === 'string') return String(e.source)
  return '—'
}

function openProfile(profileId: string) {
  router.push({ path: '/profiles', query: { profileId } })
}

const pendingClear = ref<TrustFlagRow | null>(null)
const clearError = ref<string | null>(null)
const clearing = ref(false)

function askClear(f: TrustFlagRow) {
  pendingClear.value = f
  clearError.value = null
}

async function confirmClear() {
  if (!pendingClear.value) return
  clearing.value = true
  clearError.value = null
  try {
    await clearTrustFlag(pendingClear.value.id)
    await fetchFlags(true)
    pendingClear.value = null
  } catch (err) {
    clearError.value = err instanceof Error ? err.message : 'clear failed'
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  fetchFlags(true)
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
      <h2 class="mb-0">Moderation</h2>
      <span class="text-muted ms-auto">{{ total }} flag{{ total === 1 ? '' : 's' }}</span>
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="mb-3 d-flex flex-wrap gap-3 align-items-center">
      <select
        v-model="reasonFilter"
        class="form-select"
        style="max-width: 220px"
        @change="fetchFlags(true)"
      >
        <option value="">All reasons</option>
        <option value="PROFILE_UNVETTED">PROFILE_UNVETTED</option>
        <option value="SPAM_BURST">SPAM_BURST</option>
      </select>
      <div class="form-check">
        <input
          id="include-cleared"
          v-model="includeCleared"
          type="checkbox"
          class="form-check-input"
          @change="fetchFlags(true)"
        />
        <label
          for="include-cleared"
          class="form-check-label"
          >Include cleared</label
        >
      </div>
    </div>

    <div class="table-container p-3">
      <div
        v-if="loading"
        class="text-muted"
      >
        Loading...
      </div>
      <table
        v-else
        class="table table-hover mb-0"
      >
        <thead>
          <tr>
            <th>Profile</th>
            <th>Reason</th>
            <th>FlaggedBy</th>
            <th>FlaggedAt</th>
            <th>Status</th>
            <th>Evidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="f in flags"
            :key="f.id"
            :class="{ 'table-secondary': f.clearedAt !== null }"
          >
            <td>
              <a
                href="#"
                @click.prevent="openProfile(f.profileId)"
                >{{ f.profile.publicName || f.profileId }}</a
              >
              <div class="small text-muted">
                <code>{{ f.profileId }}</code>
              </div>
            </td>
            <td>
              <span :class="reasonBadgeClass(f)">{{ f.reason }}</span>
            </td>
            <td>
              <code>{{ f.flaggedBy }}</code>
            </td>
            <td :title="f.flaggedAt">{{ new Date(f.flaggedAt).toLocaleString() }}</td>
            <td>
              <span
                v-if="f.clearedAt"
                class="text-muted small"
              >
                cleared {{ new Date(f.clearedAt).toLocaleDateString() }} by
                <code>{{ f.clearedBy ?? '—' }}</code>
              </span>
              <span
                v-else
                class="badge bg-success"
                >Active</span
              >
            </td>
            <td>{{ evidenceSummary(f) }}</td>
            <td>
              <button
                v-if="!f.clearedAt && isAdminFlag(f)"
                class="btn btn-sm btn-outline-primary"
                @click="askClear(f)"
              >
                Clear
              </button>
            </td>
          </tr>
          <tr v-if="!loading && flags.length === 0">
            <td
              colspan="7"
              class="text-center text-muted"
            >
              No flags
            </td>
          </tr>
        </tbody>
      </table>

      <div
        ref="sentinel"
        class="text-center text-muted py-2"
      >
        <span v-if="loadingMore">Loading more...</span>
      </div>
    </div>

    <!-- Confirm-clear modal -->
    <div
      v-if="pendingClear"
      class="modal d-block"
      tabindex="-1"
      @click.self="pendingClear = null"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Clear quarantine?</h5>
          </div>
          <div class="modal-body">
            <p>
              Lift the manual quarantine on
              <strong>{{ pendingClear.profile.publicName || pendingClear.profileId }}</strong
              >? Held messages on this profile will be released.
            </p>
            <div
              v-if="clearError"
              class="alert alert-danger"
            >
              {{ clearError }}
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              :disabled="clearing"
              @click="pendingClear = null"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              :disabled="clearing"
              @click="confirmClear"
            >
              {{ clearing ? 'Clearing...' : 'Clear quarantine' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="pendingClear"
      class="modal-backdrop show"
    ></div>
  </div>
</template>
