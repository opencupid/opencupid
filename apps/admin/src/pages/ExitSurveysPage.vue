<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { AccountDeletionReasonType } from '@zod/generated/inputTypeSchemas/AccountDeletionReasonSchema'
import { account_deleted as labels } from '@shared/i18n/en.json'
import { apiRequest } from '../composables/useApi'

interface ExitSurvey {
  id: string
  reason: AccountDeletionReasonType
  comment: string | null
  createdAt: string
}

interface ExitSurveysResponse {
  surveys: ExitSurvey[]
  total: number
  counts: Record<AccountDeletionReasonType, number>
}

// The wording members were shown, so the two can't drift apart.
const reasons: { value: AccountDeletionReasonType; label: string }[] = [
  { value: 'found_connection', label: labels.reason_found_connection },
  { value: 'not_a_good_fit', label: labels.reason_not_a_good_fit },
  { value: 'bad_experience', label: labels.reason_bad_experience },
  { value: 'other', label: labels.reason_other },
]
const reasonLabel = (value: AccountDeletionReasonType) =>
  reasons.find((r) => r.value === value)?.label

const surveys = ref<ExitSurvey[]>([])
const total = ref(0)
const counts = ref<Record<AccountDeletionReasonType, number> | null>(null)
const reasonFilter = ref<'' | AccountDeletionReasonType>('')
const page = ref(1)
const pageSize = 25
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const hasMore = computed(() => surveys.value.length < total.value)

const answerCount = computed(() =>
  Object.values(counts.value ?? {}).reduce((sum, count) => sum + count, 0)
)

function share(reason: AccountDeletionReasonType) {
  if (!counts.value || answerCount.value === 0) return '—'
  return `${Math.round((counts.value[reason] / answerCount.value) * 100)}%`
}

async function fetchSurveys(reset = true) {
  if (reset) page.value = 1
  if (reset) loading.value = true
  else loadingMore.value = true
  error.value = null
  try {
    const res = await apiRequest<ExitSurveysResponse>('/admin/exit-surveys', {
      params: { page: page.value, pageSize, reason: reasonFilter.value || undefined },
    })
    surveys.value = reset ? res.surveys : [...surveys.value, ...res.surveys]
    total.value = res.total
    counts.value = res.counts
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
  await fetchSurveys(false)
}

onMounted(() => {
  fetchSurveys(true)
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
      <h2 class="mb-0">Exit surveys</h2>
      <span class="text-muted ms-auto"
        >{{ answerCount }} answer{{ answerCount === 1 ? '' : 's' }}</span
      >
    </div>

    <div
      v-if="error"
      class="alert alert-danger"
    >
      {{ error }}
    </div>

    <div
      v-if="counts"
      class="table-container p-3 mb-4"
    >
      <table
        class="table mb-0"
        data-testid="summary"
      >
        <thead>
          <tr>
            <th>Reason</th>
            <th class="text-end">Answers</th>
            <th class="text-end">Share</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="reason in reasons"
            :key="reason.value"
          >
            <td>{{ reason.label }}</td>
            <td class="text-end">{{ counts[reason.value] }}</td>
            <td class="text-end">{{ share(reason.value) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mb-3">
      <select
        v-model="reasonFilter"
        class="form-select"
        style="max-width: 320px"
        aria-label="Filter by reason"
        @change="fetchSurveys(true)"
      >
        <option value="">All reasons</option>
        <option
          v-for="reason in reasons"
          :key="reason.value"
          :value="reason.value"
        >
          {{ reason.label }}
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
        data-testid="answers"
      >
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Reason</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="survey in surveys"
            :key="survey.id"
          >
            <td
              class="text-nowrap"
              :title="survey.createdAt"
            >
              {{ new Date(survey.createdAt).toLocaleString() }}
            </td>
            <td class="text-nowrap">{{ reasonLabel(survey.reason) }}</td>
            <td class="comment">{{ survey.comment ?? '—' }}</td>
          </tr>
          <tr v-if="surveys.length === 0">
            <td
              colspan="3"
              class="text-center text-muted"
            >
              No answers
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
  </div>
</template>

<style scoped>
.comment {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
