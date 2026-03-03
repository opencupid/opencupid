<script lang="ts" setup>
import Navbar from '@/features/app/components/Navbar.vue'
import AppNotifier from '@/features/app/components/AppNotifier.vue'
import CallingOverlay from '@/features/videocall/components/CallingOverlay.vue'
import JitsiModal from '@/features/videocall/components/JitsiModal.vue'
import { useI18nStore } from './store/i18nStore'
import { useCountries } from './features/shared/composables/useCountries'
import { useLanguages } from './features/shared/composables/useLanguages'
import { useUpdateChecker } from './features/app/composables/useUpdateChecker'

const i18nStore = useI18nStore()
useCountries().initialize(i18nStore.getLanguage())
useLanguages().initialize(i18nStore.getLanguage())

// Initialize update checker
useUpdateChecker()

// Initialize call store (WebRTC / call state)
import { useCallStore } from '@/features/videocall/stores/callStore'
useCallStore().initialize()
</script>

<template>
  <AppNotifier />
  <Navbar />
  <RouterView />
  <CallingOverlay />
  <JitsiModal />
</template>
