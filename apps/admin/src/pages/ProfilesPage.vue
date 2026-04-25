<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi, apiRequest } from '../composables/useApi'
import { flagProfile, clearTrustFlag } from '../composables/useTrustFlags'

interface AdminProfile {
  id: string
  publicName: string
  country: string
  cityName: string
  isSocialActive: boolean
  isDatingActive: boolean
  isActive: boolean
  isReported: boolean
  isBlocked: boolean
  isOnboarded: boolean
  gender: string | null
  createdAt: string
  userId: string
  user: { email: string | null; phonenumber: string | null } | null
  activitySummary: { segment: string } | null
  hasActiveTrustFlag: boolean
}

interface AdminProfileTrustFlag {
  id: string
  reason: 'PROFILE_UNVETTED' | 'SPAM_BURST'
  flaggedAt: string
  flaggedBy: string
  evidence: string
}

interface AdminProfileDetail extends AdminProfile {
  trustFlags: AdminProfileTrustFlag[]
}

interface ProfilesResponse {
  success: boolean
  profiles: AdminProfile[]
  total: number
  page: number
  pageSize: number
}

const { call, loading, error } = useApi()
const profiles = ref<AdminProfile[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const search = ref('')
const selectedProfile = ref<AdminProfile | null>(null)
const countries = ref<string[]>([])
const selectedCountry = ref('')
const allSegments = ['new', 'returning', 'frequent', 'dormant'] as const
const selectedSegments = ref<string[]>([])
const segmentDropdownOpen = ref(false)

// Multi-selection + bulk message modal state
const selectedProfiles = ref<Map<string, AdminProfile>>(new Map())
const selectedProfileIds = computed(() => new Set(selectedProfiles.value.keys()))
const showSendMessageModal = ref(false)
const messageContent = ref('')
const sending = ref(false)
const sendError = ref<string | null>(null)
const sendResult = ref<{ sent: number; failed: number } | null>(null)

type SortColumn =
  | 'publicName'
  | 'country'
  | 'gender'
  | 'isSocialActive'
  | 'isDatingActive'
  | 'isActive'
  | 'segment'
  | 'createdAt'
const sortColumn = ref<SortColumn | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

const sortedProfiles = computed(() => {
  if (!sortColumn.value) return profiles.value
  const col = sortColumn.value
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return [...profiles.value].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number
    if (col === 'isSocialActive' || col === 'isDatingActive' || col === 'isActive') {
      aVal = a[col] ? 1 : 0
      bVal = b[col] ? 1 : 0
    } else if (col === 'segment') {
      aVal = (a.activitySummary?.segment ?? '').toLowerCase()
      bVal = (b.activitySummary?.segment ?? '').toLowerCase()
    } else if (col === 'createdAt') {
      aVal = a.createdAt
      bVal = b.createdAt
    } else {
      aVal = (a[col] ?? '').toLowerCase()
      bVal = (b[col] ?? '').toLowerCase()
    }
    if (aVal < bVal) return -1 * dir
    if (aVal > bVal) return 1 * dir
    return 0
  })
})

function toggleSort(col: SortColumn) {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = col
    sortDirection.value = 'asc'
  }
}

function sortIndicator(col: SortColumn) {
  if (sortColumn.value !== col) return ''
  return sortDirection.value === 'asc' ? ' ▲' : ' ▼'
}

async function fetchCountries() {
  const res = await call<{ success: boolean; countries: string[] }>('/admin/profiles/countries')
  if (res) countries.value = res.countries
}

const hasMore = computed(() => profiles.value.length < total.value)
const loadingMore = ref(false)

function buildParams() {
  return {
    page: page.value,
    pageSize,
    search: search.value || undefined,
    country: selectedCountry.value || undefined,
    segments: selectedSegments.value.length > 0 ? selectedSegments.value.join(',') : undefined,
  }
}

async function fetchProfiles() {
  const res = await call<ProfilesResponse>('/admin/profiles', { params: buildParams() })
  if (res) {
    profiles.value = res.profiles
    total.value = res.total
  }
}

async function appendProfiles() {
  loadingMore.value = true
  try {
    const res = await apiRequest<ProfilesResponse>('/admin/profiles', { params: buildParams() })
    profiles.value = [...profiles.value, ...res.profiles]
    total.value = res.total
  } finally {
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  page.value++
  await appendProfiles()
}

const segmentColors: Record<string, string> = {
  new: 'bg-primary',
  returning: 'bg-success',
  frequent: 'bg-info',
  dormant: 'bg-secondary',
}

function segmentBadgeClass(segment: string) {
  return `badge ${segmentColors[segment] ?? 'bg-secondary'}`
}

const selectedProfileDetail = ref<AdminProfileDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

async function viewProfile(profile: AdminProfile) {
  selectedProfile.value = profile
  selectedProfileDetail.value = null
  detailError.value = null
  detailLoading.value = true
  try {
    const res = await apiRequest<{ success: true; profile: AdminProfileDetail }>(
      `/admin/profiles/${profile.id}`
    )
    selectedProfileDetail.value = res.profile
  } catch (err) {
    detailError.value = err instanceof Error ? err.message : 'failed to load profile'
  } finally {
    detailLoading.value = false
  }
}

async function viewProfileById(id: string) {
  const inList = profiles.value.find((p) => p.id === id)
  if (inList) return viewProfile(inList)

  detailLoading.value = true
  detailError.value = null
  try {
    const res = await apiRequest<{ success: true; profile: AdminProfileDetail }>(
      `/admin/profiles/${id}`
    )
    selectedProfile.value = res.profile
    selectedProfileDetail.value = res.profile
  } catch (err) {
    detailError.value = err instanceof Error ? err.message : 'failed to load profile'
  } finally {
    detailLoading.value = false
  }
}

const activeFlags = computed(() => selectedProfileDetail.value?.trustFlags ?? [])

// Quarantine flow (from no-flag → write admin flag)
const quarantineOpen = ref(false)
const quarantineNote = ref('')
const quarantineSubmitting = ref(false)
const quarantineError = ref<string | null>(null)

function openQuarantineForm() {
  quarantineOpen.value = true
  quarantineNote.value = ''
  quarantineError.value = null
}

function cancelQuarantine() {
  quarantineOpen.value = false
}

async function submitQuarantine() {
  if (!selectedProfile.value || quarantineNote.value.trim().length === 0) return
  quarantineSubmitting.value = true
  quarantineError.value = null
  try {
    const current = selectedProfile.value
    const res = await flagProfile(current.id, quarantineNote.value.trim())
    selectedProfile.value = { ...current, hasActiveTrustFlag: true }
    const idx = profiles.value.findIndex((p) => p.id === current.id)
    const row = idx >= 0 ? profiles.value[idx] : undefined
    if (row) {
      profiles.value[idx] = { ...row, hasActiveTrustFlag: true }
    }
    if (selectedProfileDetail.value) {
      selectedProfileDetail.value = {
        ...selectedProfileDetail.value,
        hasActiveTrustFlag: true,
        trustFlags: [...selectedProfileDetail.value.trustFlags, res.flag],
      }
    }
    quarantineOpen.value = false
  } catch (err) {
    quarantineError.value = err instanceof Error ? err.message : 'failed to quarantine'
  } finally {
    quarantineSubmitting.value = false
  }
}

// Per-flag clear flow. The confirm modal targets one flag at a time.
const pendingClearFlagId = ref<string | null>(null)
const pendingClearFlag = computed(() =>
  selectedProfileDetail.value?.trustFlags.find((f) => f.id === pendingClearFlagId.value) ?? null
)
const clearSubmitting = ref(false)
const clearErrorDetail = ref<string | null>(null)

function askClearFlag(flagId: string) {
  pendingClearFlagId.value = flagId
  clearErrorDetail.value = null
}

async function confirmClearFlag() {
  const flagId = pendingClearFlagId.value
  if (!flagId || !selectedProfile.value) return
  clearSubmitting.value = true
  clearErrorDetail.value = null
  try {
    await clearTrustFlag(flagId)
    if (selectedProfileDetail.value) {
      const remaining = selectedProfileDetail.value.trustFlags.filter((f) => f.id !== flagId)
      selectedProfileDetail.value = {
        ...selectedProfileDetail.value,
        trustFlags: remaining,
        hasActiveTrustFlag: remaining.length > 0,
      }
      if (remaining.length === 0) {
        const current = selectedProfile.value
        selectedProfile.value = { ...current, hasActiveTrustFlag: false }
        const idx = profiles.value.findIndex((p) => p.id === current.id)
        const row = idx >= 0 ? profiles.value[idx] : undefined
        if (row) {
          profiles.value[idx] = { ...row, hasActiveTrustFlag: false }
        }
      }
    }
    pendingClearFlagId.value = null
  } catch (err) {
    clearErrorDetail.value = err instanceof Error ? err.message : 'clear failed'
  } finally {
    clearSubmitting.value = false
  }
}

function resetAndFetch() {
  page.value = 1
  profiles.value = []
  fetchProfiles()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(resetAndFetch, 300)
}

function toggleSegment(segment: string) {
  const idx = selectedSegments.value.indexOf(segment)
  if (idx >= 0) {
    selectedSegments.value.splice(idx, 1)
  } else {
    selectedSegments.value.push(segment)
  }
  resetAndFetch()
}

function onCountryChange() {
  resetAndFetch()
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.dropdown')) {
    segmentDropdownOpen.value = false
  }
}

function toggleProfileSelection(profile: AdminProfile) {
  const next = new Map(selectedProfiles.value)
  if (next.has(profile.id)) next.delete(profile.id)
  else next.set(profile.id, profile)
  selectedProfiles.value = next
}

const allVisibleSelected = computed(
  () =>
    sortedProfiles.value.length > 0 &&
    sortedProfiles.value.every((p) => selectedProfileIds.value.has(p.id))
)

const someVisibleSelected = computed(
  () =>
    !allVisibleSelected.value &&
    sortedProfiles.value.some((p) => selectedProfileIds.value.has(p.id))
)

function toggleSelectAllVisible() {
  const next = new Map(selectedProfiles.value)
  if (allVisibleSelected.value) {
    for (const p of sortedProfiles.value) next.delete(p.id)
  } else {
    for (const p of sortedProfiles.value) next.set(p.id, p)
  }
  selectedProfiles.value = next
}

const selectedProfilesList = computed(() => Array.from(selectedProfiles.value.values()))

function openSendMessageModal() {
  if (selectedProfiles.value.size === 0) return
  messageContent.value = ''
  sendError.value = null
  sendResult.value = null
  showSendMessageModal.value = true
}

function closeSendMessageModal() {
  if (sending.value) return
  showSendMessageModal.value = false
}

function onSendModalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeSendMessageModal()
}

watch(showSendMessageModal, (open) => {
  if (open) document.addEventListener('keydown', onSendModalKeydown)
  else document.removeEventListener('keydown', onSendModalKeydown)
})

async function sendBulkMessage() {
  if (!messageContent.value.trim() || selectedProfiles.value.size === 0) return
  sending.value = true
  sendError.value = null
  try {
    const res = await apiRequest<{ success: boolean; sent: number; failed: number }>(
      '/admin/messages',
      {
        method: 'POST',
        body: {
          profileIds: Array.from(selectedProfiles.value.keys()),
          content: messageContent.value.trim(),
        },
      }
    )
    sendResult.value = { sent: res.sent, failed: res.failed }
    selectedProfiles.value = new Map()
    messageContent.value = ''
  } catch (err) {
    sendError.value = err instanceof Error ? err.message : 'Failed to send messages'
  } finally {
    sending.value = false
  }
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const route = useRoute()

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  fetchCountries()
  fetchProfiles()

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) loadMore()
    },
    { rootMargin: '200px' }
  )
  if (sentinel.value) observer.observe(sentinel.value)

  if (typeof route.query.profileId === 'string') {
    viewProfileById(route.query.profileId)
  }
})

watch(
  () => route.query.profileId,
  (id) => {
    if (typeof id === 'string') viewProfileById(id)
  }
)

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onSendModalKeydown)
  observer?.disconnect()
})
</script>

<template>
  <div>
    <div class="d-flex align-items-baseline mb-4">
      <h2 class="mb-0">Profiles</h2>
      <span class="text-muted ms-auto">{{ total }} result{{ total === 1 ? '' : 's' }}</span>
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="mb-3 d-flex flex-wrap gap-2">
      <input
        v-model="search"
        type="text"
        class="form-control"
        placeholder="Search by name, city, or profile ID..."
        @input="onSearchInput"
      />
      <div
        class="dropdown"
        style="max-width: 200px"
      >
        <button
          class="btn btn-outline-secondary dropdown-toggle w-100 text-start"
          type="button"
          @click="segmentDropdownOpen = !segmentDropdownOpen"
        >
          {{
            selectedSegments.length === 0
              ? 'All Segments'
              : `${selectedSegments.length} Segment${selectedSegments.length > 1 ? 's' : ''}`
          }}
        </button>
        <ul
          v-if="segmentDropdownOpen"
          class="dropdown-menu show"
          style="min-width: 180px"
        >
          <li
            v-for="seg in allSegments"
            :key="seg"
            class="dropdown-item"
            style="cursor: pointer"
            @click="toggleSegment(seg)"
          >
            <input
              type="checkbox"
              class="form-check-input me-2"
              :checked="selectedSegments.includes(seg)"
              @click.stop="toggleSegment(seg)"
            />
            {{ seg }}
          </li>
        </ul>
      </div>
      <select
        v-model="selectedCountry"
        class="form-select"
        style="max-width: 200px"
        @change="onCountryChange"
      >
        <option value="">All Countries</option>
        <option
          v-for="c in countries"
          :key="c"
          :value="c"
        >
          {{ c }}
        </option>
      </select>
      <button
        type="button"
        class="btn btn-primary ms-auto"
        :disabled="selectedProfileIds.size === 0"
        @click="openSendMessageModal"
      >
        Send message{{ selectedProfileIds.size > 0 ? ` (${selectedProfileIds.size})` : '' }}
      </button>
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
            <th style="width: 2.5rem">
              <input
                type="checkbox"
                class="form-check-input"
                aria-label="Select all visible profiles"
                :checked="allVisibleSelected"
                :indeterminate="someVisibleSelected"
                @change="toggleSelectAllVisible"
              />
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('publicName')"
            >
              Name{{ sortIndicator('publicName') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('country')"
            >
              Location{{ sortIndicator('country') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('gender')"
            >
              Gender{{ sortIndicator('gender') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isSocialActive')"
            >
              Social{{ sortIndicator('isSocialActive') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isDatingActive')"
            >
              Dating{{ sortIndicator('isDatingActive') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isActive')"
            >
              Active{{ sortIndicator('isActive') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('segment')"
            >
              Segment{{ sortIndicator('segment') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('createdAt')"
            >
              Created{{ sortIndicator('createdAt') }}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="profile in sortedProfiles"
            :key="profile.id"
            :class="{ 'table-warning': profile.hasActiveTrustFlag }"
            style="cursor: pointer"
            @click="viewProfile(profile)"
          >
            <td @click.stop>
              <input
                type="checkbox"
                class="form-check-input"
                :aria-label="`Select profile ${profile.publicName || profile.id}`"
                :checked="selectedProfileIds.has(profile.id)"
                @change="toggleProfileSelection(profile)"
              />
            </td>
            <td>{{ profile.publicName || '-' }}</td>
            <td>{{ [profile.cityName, profile.country].filter(Boolean).join(', ') || '-' }}</td>
            <td>{{ profile.gender || '-' }}</td>
            <td>
              <span :class="profile.isSocialActive ? 'badge bg-success' : 'badge bg-secondary'">
                {{ profile.isSocialActive ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span :class="profile.isDatingActive ? 'badge bg-success' : 'badge bg-secondary'">
                {{ profile.isDatingActive ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span :class="profile.isActive ? 'badge bg-success' : 'badge bg-secondary'">
                {{ profile.isActive ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span
                v-if="profile.activitySummary?.segment"
                :class="segmentBadgeClass(profile.activitySummary.segment)"
              >
                {{ profile.activitySummary.segment }}
              </span>
              <span v-else>—</span>
            </td>
            <td>{{ new Date(profile.createdAt).toLocaleDateString() }}</td>
            <td>
              <button
                class="btn btn-sm btn-outline-primary"
                @click.stop="viewProfile(profile)"
              >
                View
              </button>
            </td>
          </tr>
          <tr v-if="profiles.length === 0">
            <td
              colspan="10"
              class="text-center text-muted"
            >
              No profiles found
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

    <!-- Profile Detail Modal -->
    <div v-if="selectedProfile">
      <div
        class="modal d-block"
        tabindex="-1"
        @click.self="selectedProfile = null"
        @keydown.escape="selectedProfile = null"
        @keydown.enter.prevent="selectedProfile = null"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Profile Detail</h5>
              <button
                type="button"
                class="btn-close"
                @click="selectedProfile = null"
              ></button>
            </div>
            <div class="modal-body">
              <dl class="row mb-0">
                <dt class="col-sm-4">ID</dt>
                <dd class="col-sm-8">
                  <code>{{ selectedProfile.id }}</code>
                </dd>
                <dt class="col-sm-4">Name</dt>
                <dd class="col-sm-8">{{ selectedProfile.publicName || '-' }}</dd>
                <dt class="col-sm-4">User Email</dt>
                <dd class="col-sm-8">{{ selectedProfile.user?.email || '-' }}</dd>
                <dt class="col-sm-4">User Phone</dt>
                <dd class="col-sm-8">{{ selectedProfile.user?.phonenumber || '-' }}</dd>
                <dt class="col-sm-4">Country</dt>
                <dd class="col-sm-8">{{ selectedProfile.country || '-' }}</dd>
                <dt class="col-sm-4">City</dt>
                <dd class="col-sm-8">{{ selectedProfile.cityName || '-' }}</dd>
                <dt class="col-sm-4">Gender</dt>
                <dd class="col-sm-8">{{ selectedProfile.gender || '-' }}</dd>
                <dt class="col-sm-4">Social Active</dt>
                <dd class="col-sm-8">{{ selectedProfile.isSocialActive ? 'Yes' : 'No' }}</dd>
                <dt class="col-sm-4">Dating Active</dt>
                <dd class="col-sm-8">{{ selectedProfile.isDatingActive ? 'Yes' : 'No' }}</dd>
                <dt class="col-sm-4">Onboarded</dt>
                <dd class="col-sm-8">{{ selectedProfile.isOnboarded ? 'Yes' : 'No' }}</dd>
                <dt class="col-sm-4">Active</dt>
                <dd class="col-sm-8">{{ selectedProfile.isActive ? 'Yes' : 'No' }}</dd>
                <dt class="col-sm-4">Reported</dt>
                <dd class="col-sm-8">{{ selectedProfile.isReported ? 'Yes' : 'No' }}</dd>
                <dt class="col-sm-4">Blocked</dt>
                <dd class="col-sm-8">{{ selectedProfile.isBlocked ? 'Yes' : 'No' }}</dd>
                <dt class="col-sm-4">Activity Segment</dt>
                <dd class="col-sm-8">{{ selectedProfile.activitySummary?.segment || '—' }}</dd>
                <dt class="col-sm-4">Created</dt>
                <dd class="col-sm-8">{{ new Date(selectedProfile.createdAt).toLocaleString() }}</dd>
              </dl>

              <div class="mt-3">
                <h6 class="mb-2">Trust</h6>
                <div
                  v-if="detailLoading"
                  class="text-muted small"
                >
                  Loading trust info...
                </div>
                <div
                  v-else-if="detailError"
                  class="alert alert-danger small mb-0"
                >
                  {{ detailError }}
                </div>
                <template v-else>
                  <div
                    v-if="activeFlags.length === 0"
                    class="text-muted small"
                  >
                    No active trust flags.
                  </div>
                  <div
                    v-for="f in activeFlags"
                    v-else
                    :key="f.id"
                    class="border rounded p-2 mb-2 d-flex align-items-start gap-2"
                  >
                    <div class="flex-grow-1">
                      <div>
                        <strong>{{ f.reason }}</strong>
                        <code class="ms-2 small">{{ f.flaggedBy }}</code>
                      </div>
                      <div class="small text-muted">
                        {{ new Date(f.flaggedAt).toLocaleString() }}
                      </div>
                      <div v-if="f.evidence" class="small">
                        {{ f.evidence }}
                      </div>
                    </div>
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="askClearFlag(f.id)"
                    >
                      Clear
                    </button>
                  </div>
                </template>
              </div>
            </div>
            <div class="modal-footer flex-wrap">
              <div
                v-if="quarantineOpen"
                class="w-100"
              >
                <div
                  v-if="quarantineError"
                  class="alert alert-danger small"
                >
                  {{ quarantineError }}
                </div>
                <textarea
                  v-model="quarantineNote"
                  class="form-control mb-2"
                  rows="3"
                  placeholder="Reason for manual quarantine (1–1000 chars)"
                  :disabled="quarantineSubmitting"
                  @keydown.enter.stop
                ></textarea>
                <div class="d-flex justify-content-end gap-2">
                  <button
                    class="btn btn-secondary"
                    :disabled="quarantineSubmitting"
                    @click="cancelQuarantine"
                  >
                    Cancel
                  </button>
                  <button
                    class="btn btn-warning"
                    :disabled="quarantineSubmitting || quarantineNote.trim().length === 0"
                    @click="submitQuarantine"
                  >
                    {{ quarantineSubmitting ? 'Submitting...' : 'Confirm quarantine' }}
                  </button>
                </div>
              </div>
              <template v-else>
                <button
                  v-if="activeFlags.length === 0 && !detailLoading"
                  class="btn btn-warning me-auto"
                  @click="openQuarantineForm"
                >
                  Quarantine
                </button>
                <button
                  class="btn btn-secondary"
                  @click="selectedProfile = null"
                >
                  Close
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>

    <!-- Confirm clear quarantine modal -->
    <div v-if="pendingClearFlagId">
      <div
        class="modal d-block"
        tabindex="-1"
        @click.self="pendingClearFlagId = null"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Clear trust flag?</h5>
            </div>
            <div class="modal-body">
              <p class="mb-2">
                Profile:
                <strong>{{ selectedProfile?.publicName || selectedProfile?.id }}</strong>
              </p>
              <p class="mb-2">
                Flag: <strong>{{ pendingClearFlag?.reason }}</strong>
                <code class="ms-2 small">{{ pendingClearFlag?.flaggedBy }}</code>
              </p>
              <p class="text-muted small mb-0">
                Held messages on this profile will be released once no active flags remain.
                Clearing a SPAM_BURST flag does <em>not</em> revive its discarded conversations.
              </p>
              <div
                v-if="clearErrorDetail"
                class="alert alert-danger mt-2 mb-0"
              >
                {{ clearErrorDetail }}
              </div>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-secondary"
                :disabled="clearSubmitting"
                @click="pendingClearFlagId = null"
              >
                Cancel
              </button>
              <button
                class="btn btn-primary"
                :disabled="clearSubmitting"
                @click="confirmClearFlag"
              >
                {{ clearSubmitting ? 'Clearing...' : 'Clear flag' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>

    <!-- Send Message Modal -->
    <div v-if="showSendMessageModal">
      <div
        class="modal d-block"
        tabindex="-1"
        @click.self="closeSendMessageModal"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Send message</h5>
              <button
                type="button"
                class="btn-close"
                :disabled="sending"
                @click="closeSendMessageModal"
              ></button>
            </div>
            <div class="modal-body">
              <div
                v-if="sendResult"
                class="alert alert-success"
              >
                Sent to {{ sendResult.sent }} profile{{ sendResult.sent === 1 ? '' : 's' }}.
                <span v-if="sendResult.failed > 0"> {{ sendResult.failed }} failed. </span>
              </div>
              <div
                v-if="sendError"
                class="alert alert-danger"
              >
                {{ sendError }}
              </div>
              <template v-if="!sendResult">
                <div class="mb-3">
                  <label class="form-label fw-semibold">
                    Recipients ({{ selectedProfilesList.length }})
                  </label>
                  <div
                    class="border rounded p-2 bg-light"
                    style="max-height: 150px; overflow-y: auto"
                  >
                    <span
                      v-for="p in selectedProfilesList"
                      :key="p.id"
                      class="badge bg-secondary me-1 mb-1"
                    >
                      {{ p.publicName || p.id }}
                    </span>
                  </div>
                </div>
                <div class="mb-0">
                  <label
                    for="bulk-message-content"
                    class="form-label fw-semibold"
                  >
                    Message
                  </label>
                  <textarea
                    id="bulk-message-content"
                    v-model="messageContent"
                    class="form-control"
                    rows="6"
                    :disabled="sending"
                    placeholder="Write your message..."
                  ></textarea>
                </div>
              </template>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-secondary"
                :disabled="sending"
                @click="closeSendMessageModal"
              >
                {{ sendResult ? 'Close' : 'Cancel' }}
              </button>
              <button
                v-if="!sendResult"
                class="btn btn-primary"
                :disabled="sending || !messageContent.trim() || selectedProfilesList.length === 0"
                @click="sendBulkMessage"
              >
                {{ sending ? 'Sending...' : 'Send' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop show"></div>
    </div>
  </div>
</template>
