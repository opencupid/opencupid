<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi, apiRequest } from '../composables/useApi'

interface MessageTemplate {
  id: string
  type: string
  locale: string
  content: string
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  success: boolean
  templates: MessageTemplate[]
}

const { call, loading, error } = useApi()
const templates = ref<MessageTemplate[]>([])
const selected = ref<MessageTemplate | null>(null)
const editContent = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)

async function fetchTemplates() {
  const res = await call<ListResponse>('/admin/message-templates')
  if (res) templates.value = res.templates
}

function openEdit(t: MessageTemplate) {
  selected.value = t
  editContent.value = t.content
  saveError.value = null
}

function closeEdit() {
  selected.value = null
  editContent.value = ''
  saveError.value = null
}

async function saveTemplate() {
  if (!selected.value) return
  if (!editContent.value.trim()) {
    saveError.value = 'Content cannot be empty'
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const res = (await apiRequest(`/admin/message-templates/${selected.value.id}`, {
      method: 'PATCH',
      body: { content: editContent.value },
    })) as { success: boolean; template: MessageTemplate }
    const idx = templates.value.findIndex((t) => t.id === res.template.id)
    if (idx !== -1) templates.value[idx] = res.template
    closeEdit()
  } catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

function previewSnippet(content: string): string {
  const oneLine = content.replace(/\s+/g, ' ').trim()
  return oneLine.length > 100 ? oneLine.slice(0, 100) + '…' : oneLine
}

onMounted(fetchTemplates)
</script>

<template>
  <div>
    <div class="d-flex align-items-baseline mb-4">
      <h2 class="mb-0">Messages</h2>
      <span class="text-muted ms-auto"
        >{{ templates.length }} template{{ templates.length === 1 ? '' : 's' }}</span
      >
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
      <table
        v-else
        class="table table-hover mb-0"
      >
        <thead>
          <tr>
            <th>Template</th>
            <th>Language</th>
            <th>Preview</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in templates"
            :key="t.id"
            style="cursor: pointer"
            @click="openEdit(t)"
          >
            <td>
              <code>{{ t.type }}</code>
            </td>
            <td>{{ t.locale }}</td>
            <td class="text-muted">{{ previewSnippet(t.content) }}</td>
            <td>{{ new Date(t.updatedAt).toLocaleString() }}</td>
            <td class="text-nowrap">
              <button
                class="btn btn-sm btn-outline-primary"
                @click.stop="openEdit(t)"
              >
                Edit
              </button>
            </td>
          </tr>
          <tr v-if="templates.length === 0 && !loading">
            <td
              colspan="5"
              class="text-center text-muted"
            >
              No message templates
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="selected"
      class="modal d-block"
      tabindex="-1"
      @click.self="closeEdit"
      @keydown.escape="closeEdit"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Message Template</h5>
            <button
              type="button"
              class="btn-close"
              @click="closeEdit"
            ></button>
          </div>
          <div class="modal-body">
            <div
              v-if="saveError"
              class="alert alert-danger mb-3"
            >
              {{ saveError }}
            </div>
            <div class="mb-3">
              <label class="form-label">Template type</label>
              <input
                class="form-control"
                :value="selected.type"
                disabled
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Language</label>
              <select
                class="form-select"
                :value="selected.locale"
                disabled
              >
                <option :value="selected.locale">{{ selected.locale }}</option>
              </select>
            </div>
            <div class="mb-0">
              <label
                class="form-label"
                for="templateContent"
                >Content</label
              >
              <textarea
                id="templateContent"
                v-model="editContent"
                class="form-control"
                rows="10"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="closeEdit"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              :disabled="saving"
              @click="saveTemplate"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="selected"
      class="modal-backdrop show"
    ></div>
  </div>
</template>
