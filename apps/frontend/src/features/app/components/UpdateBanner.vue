<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/appStore'

const appStore = useAppStore()
const dismissed = ref(false)

function reloadApp() {
  window.location.reload()
}
</script>

<template>
  <div
    v-if="appStore.updateAvailable && !dismissed"
    class="alert alert-info mb-0 rounded-0 d-flex align-items-center justify-content-between"
    role="alert"
  >
    <span>An update is available.</span>
    <div class="d-flex align-items-center gap-2">
      <button
        type="button"
        class="btn btn-sm btn-primary"
        @click="reloadApp"
      >
        Reload
      </button>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        @click="dismissed = true"
      />
    </div>
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
