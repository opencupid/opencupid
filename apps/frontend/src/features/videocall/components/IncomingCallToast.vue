<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCallStore } from '../stores/callStore'

const { t } = useI18n()
const callStore = useCallStore()

defineProps<{
  callerName: string
  toastId: number | string
}>()

defineEmits<{
  (e: 'closeToast'): void
}>()

function handleAccept(closeToast: () => void) {
  callStore.acceptCall()
  closeToast()
}

function handleDecline(closeToast: () => void) {
  callStore.declineCall()
  closeToast()
}
</script>

<template>
  <div class="d-flex flex-column">
    <div class="fw-bold mb-2">
      {{ t('calls.incoming_call_from', { name: callerName }) }}
    </div>
    <div class="d-flex gap-2">
      <button
        class="btn btn-success btn-sm"
        @click="handleAccept($parent?.$emit?.bind($parent, 'close-toast') || (() => {}))"
      >
        {{ t('calls.accept') }}
      </button>
      <button
        class="btn btn-danger btn-sm"
        @click="handleDecline($parent?.$emit?.bind($parent, 'close-toast') || (() => {}))"
      >
        {{ t('calls.decline') }}
      </button>
    </div>
  </div>
</template>
