<script lang="ts" setup>
import Navbar from '@/components/nav/Navbar.vue'
import AppNotifier from '@/features/messaging/components/AppNotifier.vue'
import { useI18nStore } from './store/i18nStore'
import { useCountries } from './components/composables/useCountries'
import { useLanguages } from './components/composables/useLanguages'

// FIXME
// This is a workaround to ensure the page scrolls down
// on initial load. in order to ensure on mobile devices
// the browser address/status bar gets scrolled out of view.
// and the page takes up the full height of the viewport.
// onMounted(() => {
//   setTimeout(() => {
//     document.documentElement.scrollTop = 100
//     document.body.scrollTop = 100
//     // window.scrollTo(0, 100) // fallback
//   }, 1000)
// })
const i18nStore = useI18nStore()
useCountries().initialize(i18nStore.getLanguage())
useLanguages().initialize(i18nStore.getLanguage())

</script>

<template>
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
