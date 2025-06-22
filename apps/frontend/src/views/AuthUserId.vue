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

// Reactive variables
const error = ref('' as string)
const isLoading = ref(false)
const showModal = ref(true)

// form state
const showUserIdForm = ref(true)
const showOtpForm = ref(false)
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

// // // On mounted lifecycle hook
// onMounted(async () => {
//   const queryOtp = (route.query.otp as string) || ''

//   if (queryOtp) {
//     const ok = await doOtpLogin(queryOtp)
//     if (!ok) {
//       // showOtpForm.value = true
//     }
//   } else {
//     showUserIdForm.value = true
//   }
// })

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
      // console.log('Login link sent successfully:', user)
      // showOtpForm.value = true
      // showUserIdForm.value = false
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

// // Method to handle OTP entered
// async function handleOTPSubmitted(otp: string): Promise<boolean> {
//   return doOtpLogin(otp)
// }

// async function doOtpLogin(otp: string) {
//   isLoading.value = true
//   try {
//     const res = await authStore.otpLogin(otp)
//     if (res.success) {
//       showConfirmScreen.value = true
//       showOtpForm.value = false
//       showUserIdForm.value = false
//       await new Promise(resolve => setTimeout(resolve, 2000))
//       await router.push({ name: 'UserHome' })
//       return true
//     } else {
//       console.log('OTP login failed:', res)
//       // Handle different status flags
//       if (res.status === 'storage_error') {
//         error.value =
//           'Something is off with this browser. Please try again in a different one (or try clearing your browser storage.)'
//       }
//       if (res.status === 'missing_userid') {
//         error.value = 'Something went wrong here with the code.  Try again?'
//       }
//       if (res.status === 'missing_otp' || res.status === 'invalid_token') {
//         error.value = 'Oops, this code has probably expired. Try again?'
//       }
//       // TODO we need to give the user another chance to enter the OTP
//       // before bouncing them back to the user ID form
//       showUserIdForm.value = true
//       showOtpForm.value = false
//       return false
//     }
//   } catch (err: any) {
//     console.error(err)
//     error.value = err.response?.data?.message || 'Failed to confirm email.'
//   } finally {
//     isLoading.value = false
//   }
//   return false
// }

// function handleBackButton() {
//   showUserIdForm.value = true
//   showOtpForm.value = false
//   error.value = ''
//   isLoading.value = false
// }

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
