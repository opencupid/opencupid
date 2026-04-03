<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi'
import { apiRequest } from '../composables/useApi'

interface AdminUser {
  id: string
  email: string | null
  phonenumber: string | null
  isActive: boolean
  isBlocked: boolean
  newsletterOptIn: boolean
  isRegistrationConfirmed: boolean
  roles: string[]
  createdAt: string
  lastLoginAt: string | null
  profile: { id: string; publicName: string } | null
}

interface UsersResponse {
  success: boolean
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
}

const { call, loading, error } = useApi()
const users = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const search = ref('')
const selectedUser = ref<AdminUser | null>(null)
const editActive = ref(false)
const editBlocked = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

type SortColumn =
  | 'publicName'
  | 'isActive'
  | 'isBlocked'
  | 'createdAt'
  | 'lastLoginAt'
  | 'isRegistrationConfirmed'
  | 'newsletterOptIn'
const sortColumn = ref<SortColumn | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

const sortedUsers = computed(() => {
  if (!sortColumn.value) return users.value
  const col = sortColumn.value
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return [...users.value].sort((a, b) => {
    let aVal: string | boolean | number
    let bVal: string | boolean | number
    if (col === 'publicName') {
      aVal = a.profile?.publicName?.toLowerCase() ?? ''
      bVal = b.profile?.publicName?.toLowerCase() ?? ''
    } else if (col === 'createdAt' || col === 'lastLoginAt') {
      aVal = a[col] ? new Date(a[col]).getTime() : 0
      bVal = b[col] ? new Date(b[col]).getTime() : 0
    } else {
      aVal = a[col] ? 1 : 0
      bVal = b[col] ? 1 : 0
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
}

const selectedProfile = ref<AdminProfile | null>(null)
const profileLoading = ref(false)

async function viewProfile(profileId: string) {
  profileLoading.value = true
  try {
    const res = await apiRequest(`/admin/profiles/${profileId}`)
    const data = res as { success: boolean; profile: AdminProfile }
    if (data.success) {
      selectedProfile.value = data.profile
    }
  } catch {
    // Profile fetch failed silently — user can retry
  } finally {
    profileLoading.value = false
  }
}

const hasMore = computed(() => users.value.length < total.value)
const loadingMore = ref(false)

function buildParams() {
  return { page: page.value, pageSize, search: search.value || undefined }
}

async function fetchUsers() {
  const res = await call<UsersResponse>('/admin/users', { params: buildParams() })
  if (res) {
    users.value = res.users
    total.value = res.total
  }
}

async function appendUsers() {
  loadingMore.value = true
  try {
    const res = await apiRequest<UsersResponse>('/admin/users', { params: buildParams() })
    users.value = [...users.value, ...res.users]
    total.value = res.total
  } finally {
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  page.value++
  appendUsers()
}

function viewUser(user: AdminUser) {
  selectedUser.value = user
  editActive.value = user.isActive
  editBlocked.value = user.isBlocked
  saveError.value = null
}

async function saveUser() {
  if (!selectedUser.value) return
  saving.value = true
  saveError.value = null
  try {
    await apiRequest(`/admin/users/${selectedUser.value.id}`, {
      method: 'PATCH',
      body: { isActive: editActive.value, isBlocked: editBlocked.value },
    })
    // Update local data
    selectedUser.value.isActive = editActive.value
    selectedUser.value.isBlocked = editBlocked.value
    selectedUser.value = null
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

function resetAndFetch() {
  page.value = 1
  users.value = []
  fetchUsers()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(resetAndFetch, 300)
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  fetchUsers()
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
      <h2 class="mb-0">Users</h2>
      <span class="text-muted ms-auto">{{ total }} result{{ total === 1 ? '' : 's' }}</span>
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div class="mb-3">
      <input
        v-model="search"
        type="text"
        class="form-control"
        placeholder="Search by email or phone..."
        @input="onSearchInput"
      />
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
            <th>Email / Phone</th>
            <th
              style="cursor: pointer"
              @click="toggleSort('publicName')"
            >
              Public name{{ sortIndicator('publicName') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isRegistrationConfirmed')"
            >
              Confirmed{{ sortIndicator('isRegistrationConfirmed') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isActive')"
            >
              Active{{ sortIndicator('isActive') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isBlocked')"
            >
              Blocked{{ sortIndicator('isBlocked') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('newsletterOptIn')"
            >
              Newsletter{{ sortIndicator('newsletterOptIn') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('createdAt')"
            >
              Created{{ sortIndicator('createdAt') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('lastLoginAt')"
            >
              Last Login{{ sortIndicator('lastLoginAt') }}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in sortedUsers"
            :key="user.id"
            style="cursor: pointer"
            @click="viewUser(user)"
          >
            <td>{{ user.email || user.phonenumber || '-' }}</td>
            <td>{{ user.profile?.publicName || '-' }}</td>
            <td>
              <span :class="user.isRegistrationConfirmed ? 'badge bg-success' : 'badge bg-warning'">
                {{ user.isRegistrationConfirmed ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span :class="user.isActive ? 'badge bg-success' : 'badge bg-secondary'">
                {{ user.isActive ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span :class="user.isBlocked ? 'badge bg-danger' : 'badge bg-secondary'">
                {{ user.isBlocked ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span :class="user.newsletterOptIn ? 'badge bg-success' : 'badge bg-secondary'">
                {{ user.newsletterOptIn ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ new Date(user.createdAt).toLocaleDateString() }}</td>
            <td>{{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-' }}</td>
            <td class="text-nowrap">
              <button
                v-if="user.profile"
                class="btn btn-sm btn-outline-secondary me-1"
                :disabled="profileLoading"
                @click.stop="viewProfile(user.profile.id)"
              >
                Profile
              </button>
              <button
                class="btn btn-sm btn-outline-primary"
                @click.stop="viewUser(user)"
              >
                View
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td
              colspan="9"
              class="text-center text-muted"
            >
              No users found
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

    <!-- User Detail Modal -->
    <div
      v-if="selectedUser"
      class="modal d-block"
      tabindex="-1"
      @click.self="selectedUser = null"
      @keydown.escape="selectedUser = null"
      @keydown.enter.prevent="saveUser"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">User Detail</h5>
            <button
              type="button"
              class="btn-close"
              @click="selectedUser = null"
            ></button>
          </div>
          <div class="modal-body">
            <div
              v-if="saveError"
              class="alert alert-danger mb-3"
            >
              {{ saveError }}
            </div>
            <dl class="row mb-0">
              <dt class="col-sm-4">ID</dt>
              <dd class="col-sm-8">
                <code>{{ selectedUser.id }}</code>
              </dd>
              <dt class="col-sm-4">Email</dt>
              <dd class="col-sm-8">{{ selectedUser.email || '-' }}</dd>
              <dt class="col-sm-4">Phone</dt>
              <dd class="col-sm-8">{{ selectedUser.phonenumber || '-' }}</dd>
              <dt class="col-sm-4">Roles</dt>
              <dd class="col-sm-8">{{ selectedUser.roles.join(', ') }}</dd>
              <dt class="col-sm-4">Active</dt>
              <dd class="col-sm-8">
                <div class="form-check">
                  <input
                    id="editActive"
                    v-model="editActive"
                    class="form-check-input"
                    type="checkbox"
                  />
                  <label
                    class="form-check-label"
                    for="editActive"
                    >Active</label
                  >
                </div>
              </dd>
              <dt class="col-sm-4">Blocked</dt>
              <dd class="col-sm-8">
                <div class="form-check">
                  <input
                    id="editBlocked"
                    v-model="editBlocked"
                    class="form-check-input"
                    type="checkbox"
                  />
                  <label
                    class="form-check-label"
                    for="editBlocked"
                    >Blocked</label
                  >
                </div>
              </dd>
              <dt class="col-sm-4">Created</dt>
              <dd class="col-sm-8">{{ new Date(selectedUser.createdAt).toLocaleString() }}</dd>
              <dt class="col-sm-4">Last Login</dt>
              <dd class="col-sm-8">
                {{
                  selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleString()
                    : 'Never'
                }}
              </dd>
              <dt class="col-sm-4">Profile</dt>
              <dd class="col-sm-8">
                {{ selectedUser.profile?.publicName || 'No profile' }}
              </dd>
            </dl>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="selectedUser = null"
            >
              Close
            </button>
            <button
              class="btn btn-primary"
              :disabled="saving"
              @click="saveUser"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="selectedUser"
      class="modal-backdrop show"
    ></div>

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
