<script setup lang="ts">
import z from 'zod'
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { type LoginUser } from '@zod/user/user.dto'
import { useI18nStore } from '@/store/i18nStore'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import OtpLoginComponent from '../components/OtpLoginComponent.vue'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'

// Reactive variables
const error = ref('' as string)
const isValidated = ref<boolean | null>(null)
const isLoading = ref(false)
const lastOtpAttempt = ref('')

const router = useRouter()
const route = useRoute()
const isCheckingMagicLinkOtp = ref(Boolean(route.query.otp))
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const { t } = useI18n()

// TODO duplicate in apps/frontend/src/features/auth/views/AuthUserId.vue
const user = reactive<LoginUser>({
  id: '',
  email: '',
  phonenumber: '',
  language: i18nStore.getLanguage(),
  newsletterOptIn: true,
  isPushNotificationEnabled: false,
})

const OtpParamSchema = z.object({
  otp: z.string().min(6).max(6),
})

onMounted(async () => {
  // No query params -> display the OTP form directly
  if (!route.query.otp) {
    return
  }
  // if query params, parse and validate
  const rawOtp = typeof route.query.otp === 'string' ? route.query.otp : ''
  const params = OtpParamSchema.safeParse(route.query)
  if (!params.success) {
    error.value = t('auth.otp_invalid_link')
    lastOtpAttempt.value = rawOtp
    isValidated.value = false
    isCheckingMagicLinkOtp.value = false
    return
  }
  await doOtpLogin(params.data.otp)
  if (!isValidated.value) {
    isCheckingMagicLinkOtp.value = false
  }
})

// Method to handle OTP entered
async function handleOTPSubmitted(otp: string): Promise<void> {
  await doOtpLogin(otp)
}

async function doOtpLogin(otp: string) {
  lastOtpAttempt.value = otp
  isLoading.value = true
  try {
    const res = await authStore.otpLogin(otp)
    if (res.success) {
      isValidated.value = true
      error.value = ''
      await router.push({ name: 'UserHome' })
      return
    } else {
      switch (res.code) {
        case 'AUTH_EXPIRED_OTP':
          error.value = t('auth.otp_expired')
          break
        case 'AUTH_INVALID_OTP':
          error.value = t('auth.otp_invalid')
          break
        case 'AUTH_INVALID_INPUT':
          error.value = t('auth.otp_different_device')
          break
        default:
          error.value = t('auth.otp_unknown_error')
      }
      isValidated.value = false
      return
    }
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
  <main class="container d-flex justify-content-center align-items-center flex-column">
    <div class="d-flex flex-column align-items-center justify-content-center overflow-hidden">
      <div class="back-button">
        <a
          class="btn btn-secondary-outline"
          role="button"
          :title="$t('uicomponents.back_button_title')"
          @click="handleBackButton"
        >
          <ChevronLeftIcon class="svg-icon" />
        </a>
      </div>
      <BSpinner
        v-if="isCheckingMagicLinkOtp"
        type="grow"
        variant="primary"
      />
      <OtpLoginComponent
        v-else
        :isLoading="isLoading"
        :user="user"
        :validationResult="isValidated"
        :validationError="error"
        :initialOtp="lastOtpAttempt"
        @otp:submit="handleOTPSubmitted"
      />
    </div>
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
