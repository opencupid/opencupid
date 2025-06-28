<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { type AuthIdentifierCaptchaInput } from '@zod/user/user.dto'
import { type LoginUser } from '@zod/user/user.types'

import { useI18nStore } from '@/store/i18nStore'
import { useAuthStore } from '../stores/authStore'
import AuthIdComponent from '../components/AuthIdComponent.vue'

import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'

// Reactive variables
const error = ref('' as string)
const isLoading = ref(false)
const showModal = ref(true)

// form state
const showUserIdForm = ref(true)

const router = useRouter()
const authStore = useAuthStore()
const i18nStore = useI18nStore()

const user = reactive<LoginUser>({
  id: '',
  email: '',
  phonenumber: '',
  language: i18nStore.getLanguage(),
  isRegistrationConfirmed: false,
  isOnboarded: false,
  hasActiveProfile: false,
})

// Method to handle sending login link
async function handleSendOtp(authIdCaptcha: AuthIdentifierCaptchaInput) {
  const payload = {
    ...authIdCaptcha,
    language: user.language || 'en',
  }
  try {
    error.value = ''
    isLoading.value = true
    const res = await authStore.sendLoginLink(payload)
    if (res.success) {
      Object.assign(user, res.user)
      router.push({ name: 'LoginOTP' })
    } else {
      error.value = 'An unknown error occurred, please try again a bit later.'
    }
  } catch (err: any) {
    error.value = err || 'An unexpected error occurred.'
    console.error('Login error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleSetLanguage = (lang: string) => {
  user.language = lang
  i18nStore.setLanguage(lang)
}
</script>

<template>
  <main class="login-container">
    <BModal
      v-model="showModal"
      title="Login"
      size="md"
      :backdrop="'static'"
      centered
      button-size="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-footer="true"
      :no-header="true"
      cancel-title="Nevermind"
      initial-animation
      fullscreen="md"
      body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
      :keyboard="false"
    >
      <div class="w-100">
        <ErrorComponent :error="error" />

        <AuthIdComponent
          :isLoading="isLoading"
          @otp:send="handleSendOtp"
          @language:select="handleSetLanguage"
          v-if="showUserIdForm"
        />
      </div>
    </BModal>
  </main>
</template>

<style scoped>
:deep(.modal-body) {
  display: flex;
}
</style>
