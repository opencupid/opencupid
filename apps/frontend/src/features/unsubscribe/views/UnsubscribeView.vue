<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/features/auth/components/AuthLayout.vue'
import { useI18nStore } from '@/store/i18nStore'
import { useUnsubscribeStore, type UnsubscribeStatus } from '../stores/unsubscribeStore'

type Status = 'loading' | 'confirm' | 'done' | 'already' | 'error'

const route = useRoute()
const { t } = useI18n()
const i18nStore = useI18nStore()
const unsubscribeStore = useUnsubscribeStore()

const status = ref<Status>('loading')
const scope = ref<UnsubscribeStatus['scope']>('all')
const submitting = ref(false)

// A nearby-signups link only stops those emails, so the page says so.
const copy = computed(() =>
  scope.value === 'nearby_signups'
    ? {
        confirmTitle: 'unsubscribe.nearby_confirm_title',
        confirmBody: 'unsubscribe.nearby_confirm_body',
        doneBody: 'unsubscribe.nearby_done_body',
        alreadyBody: 'unsubscribe.nearby_already_body',
      }
    : {
        confirmTitle: 'unsubscribe.confirm_title',
        confirmBody: 'unsubscribe.confirm_body',
        doneBody: 'unsubscribe.done_body',
        alreadyBody: 'unsubscribe.already_body',
      }
)
const token = String(route.params.token ?? '')

// Apply the locale carried by the email URL before the page renders any text.
// The unsubscribe view runs unauthenticated, so the user's stored language is
// not available — the email layer encodes it as ?lang=<code>. The store ignores
// invalid values, so a tampered or stale lang param is safe.
const lang = typeof route.query.lang === 'string' ? route.query.lang : null
if (lang && i18nStore.getAvailableLocales().includes(lang)) {
  i18nStore.setLanguage(lang)
}

onMounted(async () => {
  if (!token) {
    status.value = 'error'
    return
  }
  const res = await unsubscribeStore.getStatus(token)
  if (!res.success || !res.data) {
    status.value = 'error'
    return
  }
  scope.value = res.data.scope
  status.value = res.data.alreadyUnsubscribed ? 'already' : 'confirm'
})

async function confirmUnsubscribe() {
  submitting.value = true
  const res = await unsubscribeStore.unsubscribe(token)
  submitting.value = false
  status.value = res.success ? 'done' : 'error'
}
</script>

<template>
  <AuthLayout>
    <div class="text-center py-4 unsubscribe-view">
      <template v-if="status === 'loading'">
        <BSpinner
          type="grow"
          variant="primary"
        />
      </template>

      <template v-else-if="status === 'confirm'">
        <h1 class="fs-4 mb-3">{{ t(copy.confirmTitle) }}</h1>
        <p class="text-muted mb-4">{{ t(copy.confirmBody) }}</p>
        <BButton
          variant="primary"
          :disabled="submitting"
          @click="confirmUnsubscribe"
        >
          {{ t('unsubscribe.confirm_button') }}
        </BButton>
      </template>

      <template v-else-if="status === 'done'">
        <h1 class="fs-4 mb-3">{{ t('unsubscribe.done_title') }}</h1>
        <p class="text-muted">{{ t(copy.doneBody) }}</p>
      </template>

      <template v-else-if="status === 'already'">
        <h1 class="fs-4 mb-3">{{ t('unsubscribe.already_title') }}</h1>
        <p class="text-muted">{{ t(copy.alreadyBody) }}</p>
      </template>

      <template v-else>
        <h1 class="fs-4 mb-3">{{ t('unsubscribe.error_title') }}</h1>
        <p class="text-muted">{{ t('unsubscribe.error_body') }}</p>
      </template>
    </div>
  </AuthLayout>
</template>

<style scoped>
.unsubscribe-view {
  max-width: 420px;
}
</style>
