<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCallStore } from '../stores/callStore'

const { t } = useI18n()
const callStore = useCallStore()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="callStore.status === 'calling'"
      class="calling-overlay"
    >
      <div class="calling-content text-center text-white">
        <div
          class="spinner-border text-light mb-3"
          role="status"
        >
          <span class="visually-hidden">{{ t('calls.calling') }}</span>
        </div>
        <h4>{{ t('calls.calling') }}</h4>
        <button
          class="btn btn-danger mt-3"
          @click="callStore.cancelCall()"
        >
          {{ t('calls.cancel_call') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.calling-overlay {
  position: fixed;
  inset: 0;
  z-index: 1055;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
}
.calling-content {
  padding: 2rem;
}
</style>
