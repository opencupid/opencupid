<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/features/auth/components/AuthLayout.vue'
import { useI18nStore } from '@/store/i18nStore'
import { useUnsubscribeStore } from '../stores/unsubscribeStore'

type Status = 'loading' | 'confirm' | 'done' | 'already' | 'error'

const route = useRoute()
const { t } = useI18n()
const i18nStore = useI18nStore()
const unsubscribeStore = useUnsubscribeStore()

const status = ref<Status>('loading')
const submitting = ref(false)
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
  if (!res.success) {
    status.value = 'error'
    return
  }
  status.value = res.data?.alreadyUnsubscribed ? 'already' : 'confirm'
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
        <h1 class="fs-4 mb-3">{{ t('unsubscribe.confirm_title') }}</h1>
        <p class="text-muted mb-4">{{ t('unsubscribe.confirm_body') }}</p>
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
        <p class="text-muted">{{ t('unsubscribe.done_body') }}</p>
      </template>

      <template v-else-if="status === 'already'">
        <h1 class="fs-4 mb-3">{{ t('unsubscribe.already_title') }}</h1>
        <p class="text-muted">{{ t('unsubscribe.already_body') }}</p>
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
