<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/appStore'
import { promptInstall } from '../composables/usePwaInstall'

const { t } = useI18n()
const appStore = useAppStore()
const dismissed = ref(false)
</script>

<template>
  <div
    v-if="appStore.canInstallPwa && !dismissed"
    class="alert alert-info mb-0 rounded-0 d-flex align-items-center justify-content-between"
    role="alert"
  >
    <span>{{ t('uicomponents.install_banner.message') }}</span>
    <div class="d-flex align-items-center gap-2">
      <button
        type="button"
        class="btn btn-sm btn-primary"
        @click="promptInstall"
      >
        {{ t('uicomponents.install_banner.install') }}
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
