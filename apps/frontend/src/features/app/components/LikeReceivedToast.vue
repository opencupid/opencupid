<script setup lang="ts">
defineEmits<{
  (e: 'closeToast'): void
}>()

defineProps<{
  toastId: number | string
}>()
</script>

<template>
  <div class="d-flex align-items-center clickable">
    <span>
      <!-- You have received a new like! -->
       {{ $t('matches.you_received_like') }}
    </span>
  </div>
</template>

<style scoped>
:deep(img) {
  width: 40px !important;
  height: 40px !important;
  border-radius: 9999px !important;
}
</style>
