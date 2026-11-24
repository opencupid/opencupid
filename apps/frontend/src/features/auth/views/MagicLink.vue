<script setup lang="ts">
import z from 'zod'
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import { bootstrapReady } from '@/lib/auth'
import { tracker } from '@/lib/umami'
import { loginRedirect, DEFAULT_LANDING } from '@/router/loginRedirect'
import AuthLayout from '../components/AuthLayout.vue'
import CaptchaWidget from '../components/CaptchaWidget.vue'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'
import IconMail from '@/assets/icons/interface/mail.svg'

// Only show the dev auto-login shortcut when both conditions are true:
// - Vite is running in dev mode (build-time guard — eliminates the component from prod bundles)
// - DEV_AUTH_BYPASS_ENABLED=true in .env (runtime guard — backend /auth/dev/latest-token
//   only exists when this flag is set, so showing the button without it would 404)
const DevAutoLogin =
  import.meta.env.DEV && __APP_CONFIG__.DEV_AUTH_BYPASS_ENABLED
    ? defineAsyncComponent(() => import('../components/DevAutoLogin.vue'))
    : null

const error = ref('' as string)
const isLoading = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()
const enteredEmail = localStorage.getItem('authId')

const TokenParamSchema = z.object({
  token: z.string().min(6).max(6),
})

// Mail gateways and link scanners prefetch (and often render) links in emails,
// so verifying on every load would let them burn the single-use token. Only a
// browser that requested the link (sendMagicLink stores authId) continues on
// its own; anything else has to solve the captcha. A plain Continue button was
// not enough: Gmail's click-time link checker clicks it.
const hasToken = Boolean(route.query.token)
const params = TokenParamSchema.safeParse(route.query)
const requestedHere = params.success && Boolean(localStorage.getItem('authId'))
if (hasToken && !params.success) {
  tracker.track('auth-token-failed:AUTH_MALFORMED_LINK')
  error.value = t('auth.token_invalid_link')
}

async function handleContinue() {
  if (!params.success || isLoading.value) return
  isLoading.value = true
  try {
    const res = await authStore.verifyToken(params.data.token)
    if (res.success) {
      error.value = ''
      // Wait for the orchestrator to finish bootstrapping (owner profile
      // fetched, stores initialized) before navigating into the
      // authenticated UI. Prevents the router's onboarding branch from
      // reading the pre-login bootstrap result and sending a freshly
      // registered user to /browse. bootstrapReady() rejects on bootstrap
      // failure — caught below so we surface a user-visible error instead
      // of dropping the user into a half-mounted authenticated shell.
      try {
        await bootstrapReady()
      } catch (err) {
        console.error('Bootstrap failed after login:', err)
        tracker.track('auth-bootstrap-failed')
        error.value = t('auth.token_unknown_error')
        return
      }
      await router.push(loginRedirect(router, route.query.redirect) ?? DEFAULT_LANDING)
      return
    }
    tracker.track(`auth-token-failed:${res.code}`)
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
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (requestedHere) handleContinue()
})

function handleBackButton() {
  error.value = ''
  isLoading.value = false
  // Keep the deep link so the replacement magic link still carries it.
  router.push({ name: 'Login', query: { redirect: loginRedirect(router, route.query.redirect) } })
}
</script>

<template>
  <AuthLayout>
    <div class="d-flex flex-column align-items-center justify-content-center overflow-hidden my-5">
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
      <div
        v-if="error"
        class="mt-2 text-center"
      >
        <div class="text-danger mb-2">{{ error }}</div>

        <BButton
          variant="secondary"
          :title="$t('uicomponents.back_button_title')"
          @click="handleBackButton"
        >
          {{ $t('uicomponents.back_button_title') }}
        </BButton>
      </div>
      <BSpinner
        v-else-if="requestedHere"
        class="auto-continue-spinner"
      />
      <div
        v-else-if="hasToken"
        class="text-center"
      >
        <p class="fs-5 mb-4">{{ $t('auth.magic_link_prompt') }}</p>
        <BSpinner v-if="isLoading" />
        <div
          v-else
          class="continue-captcha user-select-none"
        >
          <CaptchaWidget @update:payload="(payload) => payload && handleContinue()" />
        </div>
      </div>
      <DevAutoLogin v-else-if="DevAutoLogin" />
      <div
        v-else
        class="text-center"
      >
        <div class="fs-4 mb-3 w-100">
          <ViewTitle
            :icon="IconMail"
            title=""
            class="text-primary"
          />
          <div class="text-center">
            {{ $t('auth.token_check_messages') }}
          </div>
        </div>
        <p class="text-muted fs-6">
          {{ $t('auth.token_check_email', { email: enteredEmail }) }}<br />
          {{ $t('auth.token_check_junk') }}
        </p>
        <a
          href="#"
          class="small"
          data-testid="incorrect-email-link"
          @click.prevent="handleBackButton"
        >
          {{ $t('auth.token_incorrect_email') }}
        </a>
      </div>
    </div>
  </AuthLayout>
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
/* Keep the checkbox and its label together in the middle of the prompt. */
.continue-captcha :deep(.altcha-main) {
  justify-content: center;
}
.continue-captcha :deep(.altcha-label) {
  flex-grow: 0;
}
</style>
