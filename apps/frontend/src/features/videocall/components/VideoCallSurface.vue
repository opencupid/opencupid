<script lang="ts" setup>
import CallingOverlay from './CallingOverlay.vue'
import JitsiModal from './JitsiModal.vue'
import { useCallStore } from '../stores/callStore'

// Bootstrap the videocall feature when this component's chunk evaluates.
// callStore.initialize() registers WS bus listeners (ws:incoming_call etc.).
// App.vue mounts this surface unconditionally via defineAsyncComponent, so
// the chunk fetch starts during app.mount() and finishes well before
// connectWebSocket() opens the socket — the WS handshake is gated on two
// sequential HTTP round-trips inside bootstrap(), giving the chunk ample
// headroom to land. No race.
useCallStore().initialize()
</script>

<template>
  <CallingOverlay />
  <JitsiModal />
</template>
