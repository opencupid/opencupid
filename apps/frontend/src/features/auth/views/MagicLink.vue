<script setup lang="ts">
import z from 'zod'
import { ref, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useI18n } from 'vue-i18n'

import { useAuthStore } from '../stores/authStore'
import { bootstrapReady } from '@/lib/auth'
import { tracker } from '@/lib/umami'
import { loginRedirect, DEFAULT_LANDING } from '@/router/loginRedirect'
import AuthLayout from '../components/AuthLayout.vue'
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

const TokenParamSchema = z.object({
  token: z.string().min(6).max(6),
})

// The emailed link only lands here; nothing is spent until the user clicks
// Continue. Mail gateways and link scanners prefetch (and often render) links
// in emails, and verifying on load would let them burn the single-use token.
const hasToken = Boolean(route.query.token)
const params = TokenParamSchema.safeParse(route.query)
if (hasToken && !params.success) {
  tracker.track('auth-token-failed:AUTH_MALFORMED_LINK')
  error.value = t('auth.token_invalid_link')
}

async function handleContinue() {
  if (!params.success) return
  isLoading.value = true
  try {
    const res = await authStore.verifyToken(params.data.token)
    if (res.success) {
      error.value = ''
      // Wait for the orchestrator to finish bootstrapping (owner profile
      // fetched, stores initialized) before navigating into the
      // authenticated UI. Prevents BrowseProfiles.onMounted from reading a
      // null profile and silently skipping the /onboarding redirect for
      // freshly registered users. bootstrapReady() rejects on bootstrap
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
      <div
        v-else-if="hasToken"
        class="text-center"
      >
        <p class="fs-5 mb-4">{{ $t('auth.magic_link_prompt') }}</p>
        <BButton
          class="continue-button"
          variant="primary"
          size="lg"
          :disabled="isLoading"
          @click="handleContinue"
        >
          <BSpinner
            v-if="isLoading"
            small
          />
          {{ $t('auth.login') }}
        </BButton>
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
          {{ $t('auth.token_check_email') }}<br />
          {{ $t('auth.token_check_junk') }}
        </p>
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
</style>
