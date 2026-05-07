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
// browser fetches one chunk instead of three on login. Their transitive
// deps — vue-toastification, tinycon, callStore, notification stores —
// stay out of the eager bundle.
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
