<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { useRoute, useRouter } from 'vue-router'
import AuthIdComponent from '@/components/auth/AuthIdComponent.vue'
import type { LoginUser, SendOtpPayload } from '@zod/user.schema'
import OtpLoginComponent from '@/components/auth/OtpLoginComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import LoginConfirmComponent from '@/components/auth/LoginConfirmComponent.vue'

import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'
import { useI18n } from 'vue-i18n'

// Reactive variables
const error = ref('' as string)
const isLoading = ref(false)
const showModal = ref(true)

const user = reactive<LoginUser>({
  id: '',
  email: '',
  phonenumber: '',
  language: '',
  isRegistrationConfirmed: false,
  isOnboarded: false,
  hasActiveProfile: false,
})

// form state
const showUserIdForm = ref(true)
const showOtpForm = ref(false)
const showConfirmScreen = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

// // On mounted lifecycle hook
onMounted(async () => {
  const queryOtp = (route.query.otp as string) || ''

  if (queryOtp) {
    const ok = await doOtpLogin(queryOtp)
    if (!ok) {
      // showOtpForm.value = true
    }
  } else {
    showUserIdForm.value = true
  }
})

// Method to handle sending login link
async function handleSendOtp(payload: SendOtpPayload) {
  try {
    error.value = ''
    isLoading.value = true
    const res = await authStore.sendLoginLink(payload)
    if (res.success) {
      Object.assign(user, res.user)
      // console.log('Login link sent successfully:', user)
      showOtpForm.value = true
      showUserIdForm.value = false
    } else {
      error.value = t('errors.unknown')
    }
  } catch (err: any) {
    error.value = err || t('errors.unexpected')
    console.error('Login error:', err)
  } finally {
    isLoading.value = false
  }
}

// Method to handle OTP entered
async function handleOTPSubmitted(otp: string): Promise<boolean> {
  return doOtpLogin(otp)
}

async function doOtpLogin(otp: string) {
  isLoading.value = true
  try {
    const res = await authStore.otpLogin(otp)
    if (res.success) {
      showConfirmScreen.value = true
      showOtpForm.value = false
      showUserIdForm.value = false
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await router.push({ name: 'Onboarding' })
      return true
    } else {
      console.log('OTP login failed:', res)
      // Handle different status flags
      if (res.status === 'storage_error') {
        error.value = t('errors.browser_storage')
      }
      if (res.status === 'missing_userid') {
        error.value = t('errors.missing_code')
      }
      if (res.status === 'missing_otp' || res.status === 'invalid_token') {
        error.value = t('errors.otp_expired')
      }
      showUserIdForm.value = true
      showOtpForm.value = false
      return false
    }
  } catch (err: any) {
    console.error(err)
    error.value = err.response?.data?.message || t('errors.confirm_email_failed')
  } finally {
    isLoading.value = false
  }
  return false
}

function handleBackButton() {
  showUserIdForm.value = true
  showOtpForm.value = false
  error.value = ''
  isLoading.value = false
}
</script>

<template>
  <div class="login-container">
    <BModal
      v-model="showModal"
      :title="t('authentication.login')"
      size="md"
      :backdrop="'static'"
      centered
      button-size="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-footer="true"
      :no-header="true"
      :cancel-title="t('uicomponents.modal.close')"
      initial-animation
      fullscreen="md"
      body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
      :keyboard="false"
    >
      <div class="w-100">
        <div v-if="showOtpForm">
          <div class="back-button">
            <a class="btn btn-secondary-outline" @click="handleBackButton">
              <ChevronLeftIcon class="svg-icon" />
            </a>
          </div>
        </div>
        <ErrorComponent :error="error" />

        <AuthIdComponent :isLoading="isLoading" @otp:send="handleSendOtp" v-if="showUserIdForm" />

        <OtpLoginComponent
          :isLoading="isLoading"
          :user="user"
          @otp:submit="handleOTPSubmitted"
          v-if="showOtpForm"
        />

        <LoginConfirmComponent v-if="showConfirmScreen" />
      </div>
    </BModal>
  </div>
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
