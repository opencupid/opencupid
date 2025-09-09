<script lang="ts" setup>
import Navbar from '@/features/app/components/Navbar.vue'
import AppNotifier from '@/features/app/components/AppNotifier.vue'
import ProfileDetail from '@/features/app/components/ProfileDetail.vue'
// import PostDetail from '@/features/app/components/PostDetail.vue'
import { useI18nStore } from './store/i18nStore'
import { useCountries } from './features/shared/composables/useCountries'
import { useLanguages } from './features/shared/composables/useLanguages'

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

</script>

<template>
  <!-- <ViewportSizeDebug class="position-absolute bg-dark" /> -->
  <Navbar />
  <RouterView />
  <AppNotifier />
  <ProfileDetail />
  <!-- <PostDetail /> -->
  <!-- <router-view v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component"
                 :key="$route.path" />
    </transition>
  </router-view> -->
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';

.detail-view {
  // nav.fixed is on 1030 - on screens < md we put this above the navbar
  z-index: 1050;
  height: 100dvh;
  inset: 0;

  @include media-breakpoint-up(sm) {
    // on screens > sm navbar stays visible
    top: $navbar-height;
    height: calc(100vh - $navbar-height);
    z-index: 900;
  }
}
</style>