<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

function reloadApp() {
  window.location.reload()
}
</script>

<template>
  <div
    v-if="show"
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
        @click="emit('dismiss')"
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
