<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi'
import { apiRequest } from '../composables/useApi'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hu', label: 'Magyar' },
] as const

interface TagTranslation {
  locale: string
  name: string
}

interface AdminTag {
  id: string
  slug: string
  name: string
  isUserCreated: boolean
  isApproved: boolean
  isHidden: boolean
  createdAt: string
  translations: TagTranslation[]
  _count: { profiles: number }
}

interface TagsResponse {
  success: boolean
  tags: AdminTag[]
  total: number
  page: number
  pageSize: number
}

const { call, loading, error } = useApi()
const tags = ref<AdminTag[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const search = ref('')
const selectedTag = ref<AdminTag | null>(null)
const editSlug = ref('')
const editName = ref('')
const editTranslations = ref<Record<string, string>>({})
const saving = ref(false)
const saveError = ref<string | null>(null)
const translating = ref(false)

type SortColumn = 'slug' | 'name' | 'createdAt' | 'isUserCreated' | 'profiles' | 'en' | 'hu'
const sortColumn = ref<SortColumn | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

function getTranslation(tag: AdminTag, locale: string): string {
  return tag.translations.find((t) => t.locale === locale)?.name ?? ''
}

const sortedTags = computed(() => {
  if (!sortColumn.value) return tags.value
  const col = sortColumn.value
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return [...tags.value].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number
    if (col === 'slug') {
      aVal = a.slug.toLowerCase()
      bVal = b.slug.toLowerCase()
    } else if (col === 'name') {
      aVal = a.name.toLowerCase()
      bVal = b.name.toLowerCase()
    } else if (col === 'createdAt') {
      aVal = new Date(a.createdAt).getTime()
      bVal = new Date(b.createdAt).getTime()
    } else if (col === 'isUserCreated') {
      aVal = a.isUserCreated ? 1 : 0
      bVal = b.isUserCreated ? 1 : 0
    } else if (col === 'profiles') {
      aVal = a._count.profiles
      bVal = b._count.profiles
    } else {
      // Language columns
      aVal = getTranslation(a, col).toLowerCase()
      bVal = getTranslation(b, col).toLowerCase()
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

async function fetchTags() {
  const res = await call<TagsResponse>('/admin/tags', {
    params: { page: page.value, pageSize, search: search.value || undefined },
  })
  if (res) {
    tags.value = res.tags
    total.value = res.total
  }
}

function editTag(tag: AdminTag) {
  selectedTag.value = tag
  editSlug.value = tag.slug
  editName.value = tag.name
  editTranslations.value = {}
  for (const lang of LANGUAGES) {
    editTranslations.value[lang.code] = getTranslation(tag, lang.code)
  }
  saveError.value = null
}

async function saveTag() {
  if (!selectedTag.value) return
  saving.value = true
  saveError.value = null
  try {
    const translations = LANGUAGES.map((lang) => ({
      locale: lang.code,
      name: editTranslations.value[lang.code] || '',
    })).filter((t) => t.name)

    await apiRequest(`/admin/tags/${selectedTag.value.id}`, {
      method: 'PATCH',
      body: {
        slug: editSlug.value,
        name: editName.value,
        translations,
      },
    })
    selectedTag.value = null
    await fetchTags()
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

const untranslatedLocales = computed(() =>
  LANGUAGES.map((l) => l.code).filter((code) => !editTranslations.value[code])
)

async function translateTag() {
  if (!editName.value || untranslatedLocales.value.length === 0) return
  translating.value = true
  saveError.value = null
  try {
    const res = (await apiRequest('/admin/tags/translate', {
      method: 'POST',
      body: { text: editName.value, targetLocales: untranslatedLocales.value },
    })) as { success: boolean; translations: Record<string, string> }
    if (res.success) {
      for (const [locale, name] of Object.entries(res.translations)) {
        editTranslations.value[locale] = name
      }
    }
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : 'Translation failed'
  } finally {
    translating.value = false
  }
}

const totalPages = ref(0)
watch(total, (t) => {
  totalPages.value = Math.ceil(t / pageSize)
})

function prevPage() {
  page.value--
  fetchTags()
}

function nextPage() {
  page.value++
  fetchTags()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchTags()
  }, 300)
}

onMounted(fetchTags)
</script>

<template>
  <div>
    <h2 class="mb-4">Tags</h2>

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
        placeholder="Search by name, slug, or translation..."
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
            <th
              style="cursor: pointer"
              @click="toggleSort('slug')"
            >
              Slug{{ sortIndicator('slug') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('name')"
            >
              Original Title{{ sortIndicator('name') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('createdAt')"
            >
              Created{{ sortIndicator('createdAt') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('isUserCreated')"
            >
              User Submitted{{ sortIndicator('isUserCreated') }}
            </th>
            <th
              style="cursor: pointer"
              @click="toggleSort('profiles')"
            >
              Profiles{{ sortIndicator('profiles') }}
            </th>
            <th
              v-for="lang in LANGUAGES"
              :key="lang.code"
              style="cursor: pointer"
              @click="toggleSort(lang.code)"
            >
              {{ lang.label }}{{ sortIndicator(lang.code) }}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tag in sortedTags"
            :key="tag.id"
            style="cursor: pointer"
            @click="editTag(tag)"
          >
            <td>{{ tag.slug }}</td>
            <td>{{ tag.name }}</td>
            <td>{{ new Date(tag.createdAt).toLocaleDateString() }}</td>
            <td>
              <span :class="tag.isUserCreated ? 'badge bg-info' : 'badge bg-secondary'">
                {{ tag.isUserCreated ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>{{ tag._count.profiles }}</td>
            <td
              v-for="lang in LANGUAGES"
              :key="lang.code"
            >
              {{ getTranslation(tag, lang.code) || '—' }}
            </td>
            <td>
              <button
                class="btn btn-sm btn-outline-primary"
                @click.stop="editTag(tag)"
              >
                Edit
              </button>
            </td>
          </tr>
          <tr v-if="tags.length === 0">
            <td
              :colspan="5 + LANGUAGES.length + 1"
              class="text-center text-muted"
            >
              No tags found
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

    <!-- Tag Edit Modal -->
    <div
      v-if="selectedTag"
      class="modal d-block"
      tabindex="-1"
      @click.self="selectedTag = null"
      @keydown.escape="selectedTag = null"
      @keydown.enter.prevent="saveTag"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Tag</h5>
            <button
              type="button"
              class="btn-close"
              @click="selectedTag = null"
            ></button>
          </div>
          <div class="modal-body">
            <div
              v-if="saveError"
              class="alert alert-danger mb-3"
            >
              {{ saveError }}
            </div>
            <dl class="row mb-3">
              <dt class="col-sm-4">ID</dt>
              <dd class="col-sm-8">
                <code>{{ selectedTag.id }}</code>
              </dd>
            </dl>
            <div class="mb-3">
              <label
                for="editSlug"
                class="form-label"
                >Slug</label
              >
              <input
                id="editSlug"
                v-model="editSlug"
                type="text"
                class="form-control"
              />
            </div>
            <div class="mb-3">
              <label
                for="editName"
                class="form-label"
                >Original Name</label
              >
              <input
                id="editName"
                v-model="editName"
                type="text"
                class="form-control"
              />
            </div>
            <div
              v-for="lang in LANGUAGES"
              :key="lang.code"
              class="mb-3"
            >
              <label
                :for="`editTrans_${lang.code}`"
                class="form-label"
                >{{ lang.label }} Translation</label
              >
              <input
                :id="`editTrans_${lang.code}`"
                v-model="editTranslations[lang.code]"
                type="text"
                class="form-control"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="selectedTag = null"
            >
              Cancel
            </button>
            <button
              class="btn btn-outline-info"
              :disabled="translating || untranslatedLocales.length === 0"
              @click="translateTag"
            >
              {{ translating ? 'Translating...' : 'Translate' }}
            </button>
            <button
              class="btn btn-primary"
              :disabled="saving"
              @click="saveTag"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="selectedTag"
      class="modal-backdrop show"
    ></div>
  </div>
</template>
