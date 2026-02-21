<script setup lang="ts">
import { useToast } from 'vue-toastification'
import { useCallStore } from '../stores/callStore'

const callStore = useCallStore()
const toast = useToast()

const props = defineProps<{
  callerName: string
  toastId: number | string
}>()

function handleAccept() {
  callStore.acceptCall()
  toast.dismiss(props.toastId)
}

function handleDecline() {
  callStore.declineCall()
  toast.dismiss(props.toastId)
}
</script>

<template>
  <div class="d-flex flex-column">
    <div class="fw-bold mb-2">
      {{ $t('calls.incoming_call_from', { name: callerName }) }}
    </div>
    <div class="d-flex gap-2">
      <button
        class="btn btn-success btn-sm"
        @click="handleAccept"
      >
        {{ $t('calls.accept') }}
      </button>
      <button
        class="btn btn-danger btn-sm"
        @click="handleDecline"
      >
        {{ $t('calls.decline') }}
      </button>
    </div>
  </div>
</template>
