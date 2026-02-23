<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi'

interface AdminUser {
  id: string
  email: string | null
  phonenumber: string | null
  isActive: boolean
  isBlocked: boolean
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

async function fetchUsers() {
  const res = await call<UsersResponse>('/api/admin/users', {
    params: { page: page.value, pageSize, search: search.value || undefined },
  })
  if (res) {
    users.value = res.users
    total.value = res.total
  }
}

async function toggleActive(user: AdminUser) {
  await call('/api/admin/users/' + user.id, {
    method: 'PATCH',
    body: { isActive: !user.isActive },
  })
  await fetchUsers()
}

async function toggleBlocked(user: AdminUser) {
  await call('/api/admin/users/' + user.id, {
    method: 'PATCH',
    body: { isBlocked: !user.isBlocked },
  })
  await fetchUsers()
}

function viewUser(user: AdminUser) {
  selectedUser.value = user
}

const totalPages = ref(0)
watch(total, (t) => {
  totalPages.value = Math.ceil(t / pageSize)
})

function prevPage() {
  page.value--
  fetchUsers()
}

function nextPage() {
  page.value++
  fetchUsers()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchUsers()
  }, 300)
}

onMounted(fetchUsers)
</script>

<template>
  <div>
    <h2 class="mb-4">Users</h2>

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
            <th>Profile</th>
            <th>Roles</th>
            <th>Active</th>
            <th>Blocked</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
          >
            <td>{{ user.email || user.phonenumber || '-' }}</td>
            <td>{{ user.profile?.publicName || '-' }}</td>
            <td>{{ user.roles.join(', ') }}</td>
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
            <td>{{ new Date(user.createdAt).toLocaleDateString() }}</td>
            <td>
              <button
                class="btn btn-sm btn-outline-primary me-1"
                @click="viewUser(user)"
              >
                View
              </button>
              <button
                class="btn btn-sm btn-outline-warning me-1"
                @click="toggleActive(user)"
              >
                {{ user.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                @click="toggleBlocked(user)"
              >
                {{ user.isBlocked ? 'Unblock' : 'Block' }}
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td
              colspan="7"
              class="text-center text-muted"
            >
              No users found
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

    <!-- User Detail Modal -->
    <div
      v-if="selectedUser"
      class="modal d-block"
      tabindex="-1"
      @click.self="selectedUser = null"
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
              <dd class="col-sm-8">{{ selectedUser.isActive ? 'Yes' : 'No' }}</dd>
              <dt class="col-sm-4">Blocked</dt>
              <dd class="col-sm-8">{{ selectedUser.isBlocked ? 'Yes' : 'No' }}</dd>
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
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="selectedUser"
      class="modal-backdrop show"
    ></div>
  </div>
</template>
