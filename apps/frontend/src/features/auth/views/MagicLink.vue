<script setup lang="ts">
import z from 'zod'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import TokenInput from '../components/TokenInput.vue'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'

// Reactive variables
const error = ref('' as string)
const isValidated = ref<boolean | null>(null)
const isLoading = ref(false)
const lastTokenAttempt = ref('')

const router = useRouter()
const route = useRoute()
const isCheckingMagicLinkToken = ref(Boolean(route.query.token))
const authStore = useAuthStore()
const { t } = useI18n()

const TokenParamSchema = z.object({
  token: z.string().min(6).max(6),
})

onMounted(async () => {
  if (!route.query.token) {
    return
  }
  const rawToken = typeof route.query.token === 'string' ? route.query.token : ''
  const params = TokenParamSchema.safeParse(route.query)
  if (!params.success) {
    error.value = t('auth.token_invalid_link')
    lastTokenAttempt.value = rawToken
    isValidated.value = false
    isCheckingMagicLinkToken.value = false
    return
  }
  await doVerifyToken(params.data.token)
  if (!isValidated.value) {
    isCheckingMagicLinkToken.value = false
  }
})

async function handleTokenSubmitted(token: string): Promise<void> {
  await doVerifyToken(token)
}

async function doVerifyToken(token: string) {
  lastTokenAttempt.value = token
  isLoading.value = true
  try {
    const res = await authStore.verifyToken(token)
    if (res.success) {
      isValidated.value = true
      error.value = ''
      await router.push({ name: 'UserHome' })
      return
    } else {
      switch (res.code) {
        case 'AUTH_EXPIRED_TOKEN':
          error.value = t('auth.token_expired')
          break
        case 'AUTH_INVALID_TOKEN':
          error.value = t('auth.token_invalid')
          break
        case 'AUTH_INVALID_INPUT':
          error.value = t('auth.token_different_device')
          break
        default:
          error.value = t('auth.token_unknown_error')
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
        v-if="isCheckingMagicLinkToken"
        type="grow"
        variant="primary"
      />
      <TokenInput
        v-else-if="authStore.isPhoneAuth"
        :isLoading="isLoading"
        :user="authStore.loginUser!"
        :validationResult="isValidated"
        :validationError="error"
        :initialToken="lastTokenAttempt"
        @token:submit="handleTokenSubmitted"
      />
      <div
        v-else
        class="text-center"
      >
        <p>{{ $t('auth.token_check_email') }}</p>
        <div
          v-if="error"
          class="text-danger mt-2"
        >
          {{ error }}
        </div>
      </div>
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
