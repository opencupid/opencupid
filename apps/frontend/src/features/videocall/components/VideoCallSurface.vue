<script lang="ts" setup>
import { onUnmounted } from 'vue'
import CallingOverlay from './CallingOverlay.vue'
import JitsiModal from './JitsiModal.vue'
import { useCallStore } from '../stores/callStore'

// Bootstrap the videocall feature when this component mounts. callStore
// registers WS bus listeners (ws:incoming_call etc.) on initialize and
// removes them on teardown. Pairing the two with the component lifecycle
// keeps listeners single-registered across logout → login cycles, when
// AuthenticatedSurface (and its child VideoCallSurface) re-mounts.
const callStore = useCallStore()
callStore.initialize()
onUnmounted(() => callStore.teardown())
</script>

<template>
  <CallingOverlay />
  <JitsiModal />
</template>
