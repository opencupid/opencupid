<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/lib/api'
import AuthLayout from '@/features/auth/components/AuthLayout.vue'

type Status = 'loading' | 'confirm' | 'done' | 'already' | 'error'

const route = useRoute()
const { t } = useI18n()

const status = ref<Status>('loading')
const submitting = ref(false)
const token = String(route.params.token ?? '')

onMounted(async () => {
  if (!token) {
    status.value = 'error'
    return
  }
  try {
    const res = await api.get(`/unsubscribe/${encodeURIComponent(token)}`)
    status.value = res.data.alreadyUnsubscribed ? 'already' : 'confirm'
  } catch {
    status.value = 'error'
  }
})

async function confirmUnsubscribe() {
  submitting.value = true
  try {
    await api.post(`/unsubscribe/${encodeURIComponent(token)}`)
    status.value = 'done'
  } catch {
    status.value = 'error'
  } finally {
    submitting.value = false
  }
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
