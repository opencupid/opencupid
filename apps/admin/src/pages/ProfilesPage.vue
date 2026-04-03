<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi, apiRequest } from '../composables/useApi'

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

function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  page.value++
  appendProfiles()
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

function viewProfile(profile: AdminProfile) {
  selectedProfile.value = profile
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

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

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
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  observer?.disconnect()
})
</script>

<template>
  <div>
    <h2 class="mb-4">Profiles</h2>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="mb-3 d-flex gap-2">
      <input
        v-model="search"
        type="text"
        class="form-control"
        placeholder="Search by name or city..."
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
            style="cursor: pointer"
            @click="viewProfile(profile)"
          >
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
              colspan="9"
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
    <div
      v-if="selectedProfile"
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
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="selectedProfile = null"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="selectedProfile"
      class="modal-backdrop show"
    ></div>
  </div>
</template>
