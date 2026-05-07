<script lang="ts" setup>
import { defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import UpdateBanner from '@/features/app/components/UpdateBanner.vue'
import { useI18nStore } from './store/i18nStore'
import { useCountries } from './features/shared/composables/useCountries'
import { useLanguages } from './features/shared/composables/useLanguages'
import { useUpdateChecker } from './features/app/composables/useUpdateChecker'
import { useAuthStore } from './features/auth/stores/authStore'

// All three authenticated-only surfaces (AppNotifier, FaviconNotification,
// VideoCallSurface) are bundled together via AuthenticatedSurface so the
// browser fetches one chunk instead of three on login. Transitive deps
// reachable only through these components — tinycon, callStore, the
// notification stores, the call api client, the toast components — stay
// out of the eager bundle. (vue-toastification itself stays eager because
// its plugin is registered at app boot in main.ts; only the toast
// components/handlers that USE useToast() lazy-load with this surface.)
const AuthenticatedSurface = defineAsyncComponent(
  () => import('@/features/app/components/AuthenticatedSurface.vue')
)

const i18nStore = useI18nStore()
useCountries().initialize(i18nStore.getLanguage())
useLanguages().initialize(i18nStore.getLanguage())

useUpdateChecker()

const { isLoggedIn } = storeToRefs(useAuthStore())
</script>

<template>
  <UpdateBanner />
  <RouterView />
  <AuthenticatedSurface v-if="isLoggedIn" />
</template>
