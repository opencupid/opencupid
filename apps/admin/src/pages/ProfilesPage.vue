<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi'

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

async function fetchProfiles() {
  const res = await call<ProfilesResponse>('/api/admin/profiles', {
    params: { page: page.value, pageSize, search: search.value || undefined },
  })
  if (res) {
    profiles.value = res.profiles
    total.value = res.total
  }
}

function viewProfile(profile: AdminProfile) {
  selectedProfile.value = profile
}

const totalPages = ref(0)
watch(total, (t) => {
  totalPages.value = Math.ceil(t / pageSize)
})

function prevPage() {
  page.value--
  fetchProfiles()
}

function nextPage() {
  page.value++
  fetchProfiles()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchProfiles()
  }, 300)
}

onMounted(fetchProfiles)
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

    <div class="mb-3">
      <input
        v-model="search"
        type="text"
        class="form-control"
        placeholder="Search by name, city, or country..."
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
            <th>Name</th>
            <th>Location</th>
            <th>Gender</th>
            <th>Social</th>
            <th>Dating</th>
            <th>Active</th>
            <th>Flags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="profile in profiles"
            :key="profile.id"
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
                v-if="profile.isReported"
                class="badge bg-warning me-1"
                >Reported</span
              >
              <span
                v-if="profile.isBlocked"
                class="badge bg-danger"
                >Blocked</span
              >
              <span
                v-if="!profile.isReported && !profile.isBlocked"
                class="text-muted"
                >-</span
              >
            </td>
            <td>
              <button
                class="btn btn-sm btn-outline-primary"
                @click="viewProfile(profile)"
              >
                View
              </button>
            </td>
          </tr>
          <tr v-if="profiles.length === 0">
            <td
              colspan="8"
              class="text-center text-muted"
            >
              No profiles found
            </td>
          </tr>
        </tbody>
      </table>

      <nav
        v-if="totalPages > 1"
        class="mt-3"
      >
        <ul class="pagination pagination-sm mb-0">
          <li
            class="page-item"
            :class="{ disabled: page === 1 }"
          >
            <button
              class="page-link"
              @click="prevPage"
            >
              Previous
            </button>
          </li>
          <li class="page-item disabled">
            <span class="page-link">Page {{ page }} of {{ totalPages }}</span>
          </li>
          <li
            class="page-item"
            :class="{ disabled: page >= totalPages }"
          >
            <button
              class="page-link"
              @click="nextPage"
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Profile Detail Modal -->
    <div
      v-if="selectedProfile"
      class="modal d-block"
      tabindex="-1"
      @click.self="selectedProfile = null"
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
