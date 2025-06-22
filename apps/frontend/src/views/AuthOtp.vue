<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { useRoute, useRouter } from 'vue-router'
import AuthIdComponent from '@/components/auth/AuthIdComponent.vue'
import type { AuthIdentifierCaptchaInput } from '@zod/user/user.dto'
import OtpLoginComponent from '@/components/auth/OtpLoginComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import LoginConfirmComponent from '@/components/auth/LoginConfirmComponent.vue'

import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'
import { type LoginUser } from '@zod/user/user.types'
import { useI18nStore } from '@/store/i18nStore'
import z from 'zod'

// Reactive variables
const error = ref('' as string)
const isValidated = ref<boolean | null>(null)
const isLoading = ref(false)
const showModal = ref(true)

// form state
// const showUserIdForm = ref(true)
// const showOtpForm = ref(false)
const showConfirmScreen = ref(false)

const router = useRouter()
const route = useRoute()
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

const OtpParamSchema = z.object({
  otp: z.string().min(6).max(6),
})

// // On mounted lifecycle hook
onMounted(async () => {
  // no query params -> do nothing here and display form
  if (!route.query.otp) return
  isLoading.value = true
  // if query params, parse and validate
  const params = OtpParamSchema.safeParse(route.query)
  if (!params.success) {
    error.value =
      "Hmm that link in the email didn't look right. Please enter the code in the message."
    return
  }
  await doOtpLogin(params.data.otp)
})

// Method to handle OTP entered
async function handleOTPSubmitted(otp: string): Promise<void> {
  await doOtpLogin(otp)
}

async function doOtpLogin(otp: string) {
  isLoading.value = true
  try {
    const res = await authStore.otpLogin(otp)
    if (res.success) {
      showConfirmScreen.value = true
      await new Promise(resolve => setTimeout(resolve, 2000))
      await router.push({ name: 'UserHome' })
      isValidated.value = true
      error.value = ''
      return
    } else {
      console.log('OTP login failed:', res)
      switch (res.code) {
        case 'AUTH_EXPIRED_OTP':
          error.value = 'This code has expired. Please request a new one.'
          break
        case 'AUTH_INVALID_OTP':
          error.value = 'The OTP is invalid. Please try again.'
          break
        default:
          error.value = res.message || 'An unknown error occurred. Please try again later.'
      }
      isValidated.value = false
      return
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to confirm email.'
  } finally {
    isLoading.value = false
  }
}

function handleBackButton() {
  error.value = ''
  isLoading.value = false
  router.push({ name: 'Login' })
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
        <div class="back-button">
          <a class="btn btn-secondary-outline" @click="handleBackButton">
            <ChevronLeftIcon class="svg-icon" />
          </a>
        </div>
        <div v-if="!showConfirmScreen">
          <OtpLoginComponent
            :isLoading="isLoading"
            :user="user"
            :validationResult="isValidated"
            :validationError="error"
            @otp:submit="handleOTPSubmitted"
          />
          <!-- <ErrorComponent :error="error" /> -->
        </div>
        <LoginConfirmComponent v-else />
      </div>
    </BModal>
  </main>
</template>

<style scoped>
.back-button {
  position: absolute;
  top: 0;
  left: 0;
}
:deep(.modal-body) {
  display: flex;
}
</style>
