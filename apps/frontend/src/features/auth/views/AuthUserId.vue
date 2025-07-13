<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { type UserIdentifyPayload } from '@zod/user/user.dto'
import { type LoginUser } from '@zod/user/user.dto'

import { useI18nStore } from '@/store/i18nStore'
import { useAuthStore } from '../stores/authStore'
import AuthIdComponent from '../components/AuthIdComponent.vue'
import LocaleSelector from '../../shared/ui/LocaleSelector.vue'

import ErrorComponent from '@/features/shared/ui/ErrorComponent.vue'
import LogoComponent from '@/features/shared/ui/LogoComponent.vue'

// State
const error = ref('' as string)
const isLoading = ref(false)

const router = useRouter()
const authStore = useAuthStore()
const i18nStore = useI18nStore()

const user = reactive<LoginUser>({
  id: '',
  email: '',
  phonenumber: '',
  language: i18nStore.getLanguage(),
})

// Method to handle sending login link
async function handleSendOtp(authIdCaptcha: UserIdentifyPayload) {
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
  <main class="container d-flex justify-content-center align-items-center flex-column">
    <LogoComponent class="w-25 mb-2 mb-md-4"/>

    <ErrorComponent :error="error" />

    <AuthIdComponent
      :isLoading="isLoading"
      v-model="user"
      @updated="handleSendOtp"
    />

    <div class="d-flex justify-content-center align-items-center mt-3 text-center">
      <LocaleSelector @language:select="(lang: string) => handleSetLanguage(lang)" />
    </div>
  </main>
</template>

