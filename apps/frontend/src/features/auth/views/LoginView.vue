<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { type UserIdentifyPayload } from '@zod/user/user.dto'

import { useI18nStore } from '@/store/i18nStore'
import { useAuthStore } from '../stores/authStore'
import LoginForm from '../components/LoginForm.vue'
import LocaleSelector from '../../shared/ui/LocaleSelector.vue'

import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'
import LogoComponent from '@/features/shared/ui/LogoComponent.vue'

// State
const error = ref('' as string)
const isLoading = ref(false)

const router = useRouter()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const { t } = useI18n()

// Method to handle sending login link
async function handleSendOtp(authIdCaptcha: UserIdentifyPayload) {
  const payload = {
    ...authIdCaptcha,
    language: i18nStore.getLanguage() || 'en',
  }
  try {
    error.value = ''
    isLoading.value = true
    const res = await authStore.sendMagicLink(payload)
    if (res.success) {
      router.push({ name: 'MagicLink' })
    } else {
      error.value = res.message || t('auth.unknown_error')
    }
  } finally {
    isLoading.value = false
  }
}

const handleSetLanguage = (lang: string) => {
  i18nStore.setLanguage(lang)
}

const defaultAuthId = localStorage.getItem('authId') || ''
</script>

<template>
  <main class="container d-flex justify-content-center align-items-center flex-column">
    <LogoComponent class="w-25 mb-2 mb-md-4 auth-logo" />

    <ErrorComponent :error="error" />

    <LoginForm
      :isLoading="isLoading"
      :defaultAuthId="defaultAuthId"
      @updated="handleSendOtp"
    />

    <div class="d-flex justify-content-center align-items-center mt-3 text-center">
      <LocaleSelector @language:select="(lang: string) => handleSetLanguage(lang)" />
    </div>
  </main>
</template>

<style scoped>
@media (min-width: 992px) {
  .auth-logo {
    width: 12.5% !important;
  }
}
</style>
