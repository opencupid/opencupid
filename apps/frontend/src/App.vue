<script lang="ts" setup>
import Navbar from '@/features/app/components/Navbar.vue'
import AppNotifier from '@/features/app/components/AppNotifier.vue'
import { useI18nStore } from './store/i18nStore'
import { useCountries } from './features/shared/composables/useCountries'
import { useLanguages } from './features/shared/composables/useLanguages'
import { useUpdateChecker } from './features/app/composables/useUpdateChecker'

import ViewportSizeDebug from '@/features/app/components/ViewportSizeDebug.vue'
import { computed } from 'vue'
// FIXME
// This is a workaround to ensure the page scrolls down
// on initial load. in order to ensure on mobile devices
// the browser address/status bar gets scrolled out of view.
// and the page takes up the full height of the viewport.
// onMounted(() => {
//   setTimeout(() => {
//     document.documentElement.scrollTop = 100
//     document.body.scrollTop = 100
//     // window.scr 100) // fallback
//   }, 1000)
// })
const i18nStore = useI18nStore()
useCountries().initialize(i18nStore.getLanguage())
useLanguages().initialize(i18nStore.getLanguage())

// Initialize update checker
useUpdateChecker()

</script>

<template>
  <!-- <ViewportSizeDebug class="position-absolute bg-dark" /> -->
  <Navbar />
  <RouterView />
  <AppNotifier />
  <!-- <router-view v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component"
                 :key="$route.path" />
    </transition>
  </router-view> -->
</template>
