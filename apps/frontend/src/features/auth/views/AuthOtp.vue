<script setup lang="ts">
import z from 'zod'
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { type LoginUser } from '@zod/user/user.dto'
import { useI18nStore } from '@/store/i18nStore'

import { useAuthStore } from '../stores/authStore'
import OtpLoginComponent from '../components/OtpLoginComponent.vue'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'

// Reactive variables
const error = ref('' as string)
const isValidated = ref<boolean | null>(null)
const isLoading = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const i18nStore = useI18nStore()

const user = reactive<LoginUser>({
  id: '',
  email: '',
  phonenumber: '',
  language: i18nStore.getLanguage(),
})

const OtpParamSchema = z.object({
  otp: z.string().min(6).max(6),
})

// // On mounted lifecycle hook
onMounted(async () => {
  // TODO this logic needs fixing.
  // no query params -> do nothing here and display form
  if (!route.query.otp) {
    // call method on authStore to look up user 
    // obtain login user ID (phone or email)
    return
  }
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
      isValidated.value = true
      error.value = ''
      await router.push({ name: 'UserHome' })
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
  <main class="container d-flex justify-content-center align-items-center flex-column">
    <div class="d-flex flex-column align-items-center justify-content-center overflow-hidden">
      <div class="back-button">
        <a class="btn btn-secondary-outline" @click="handleBackButton">
          <ChevronLeftIcon class="svg-icon" />
        </a>
      </div>
      <OtpLoginComponent
        :isLoading="isLoading"
        :user="user"
        :validationResult="isValidated"
        :validationError="error"
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
