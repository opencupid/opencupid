<script lang="ts" setup>
// Barrel of authenticated-only surfaces. Mounted under v-if="isLoggedIn"
// in App.vue via defineAsyncComponent so all three children + their
// transitive deps (vue-toastification, tinycon, notification stores,
// callStore, Jitsi/CallingOverlay) ship as one lazy chunk instead of
// three sibling chunks.
import AppNotifier from './AppNotifier.vue'
import FaviconNotification from './FaviconNotification.vue'
import VideoCallSurface from '@/features/videocall/components/VideoCallSurface.vue'
</script>

<template>
  <AppNotifier />
  <VideoCallSurface />
  <FaviconNotification />
</template>
