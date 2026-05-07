<script lang="ts" setup>
import FaviconNotification from '@/features/app/components/FaviconNotification.vue'
import AppNotifier from '@/features/app/components/AppNotifier.vue'
import UpdateBanner from '@/features/app/components/UpdateBanner.vue'
import VideoCallSurface from '@/features/videocall/components/VideoCallSurface.vue'

import { useI18nStore } from './store/i18nStore'
import { useCountries } from './features/shared/composables/useCountries'
import { useLanguages } from './features/shared/composables/useLanguages'
import { useUpdateChecker } from './features/app/composables/useUpdateChecker'

const i18nStore = useI18nStore()
useCountries().initialize(i18nStore.getLanguage())
useLanguages().initialize(i18nStore.getLanguage())

useUpdateChecker()
</script>

<template>
  <UpdateBanner />
  <RouterView />
  <AppNotifier />
  <VideoCallSurface />
  <FaviconNotification />
</template>
