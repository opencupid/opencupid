<script setup lang="ts">
import { useAppStore } from '../stores/appStore'

const appStore = useAppStore()

function reloadApp() {
  window.location.reload()
}
</script>

<template>
  <div
    v-if="appStore.updateAvailable"
    class="alert alert-info mb-0 rounded-0 d-flex align-items-center justify-content-between"
    role="alert"
  >
    <span>An update is available.</span>
    <button
      type="button"
      class="btn btn-sm btn-primary"
      @click="reloadApp"
    >
      Reload
    </button>
  </div>
</template>

<style scoped>
.alert {
  position: sticky;
  top: 0;
  z-index: 1030;
  border-left: 0;
  border-right: 0;
  border-top: 0;
}
</style>
