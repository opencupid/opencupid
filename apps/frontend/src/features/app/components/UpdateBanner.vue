<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/appStore'

const { t } = useI18n()
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
    <span>{{ t('uicomponents.update_banner.message') }}</span>
    <div class="d-flex align-items-center gap-2">
      <button
        type="button"
        class="btn btn-sm btn-primary"
        @click="reloadApp"
      >
        {{ t('uicomponents.update_banner.reload') }}
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  border-left: 0;
  border-right: 0;
  border-top: 0;
}
</style>
