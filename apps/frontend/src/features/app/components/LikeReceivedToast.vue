<script setup lang="ts">
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import { type InteractionEdge } from '@zod/datinginteraction/datinginteraction.dto'
// import { useI18n } from 'vue-i18n';
// const { t } = useI18n()

defineEmits<{
  (e: 'closeToast'): void
}>()

defineProps<{
  toastId: number | string
}>()
</script>

<template>
  <div class="d-flex align-items-center clickable">
    <span> You have received a new like!</span>
  </div>
</template>

<style scoped>
:deep(img) {
  width: 40px !important;
  height: 40px !important;
  border-radius: 9999px !important;
}
</style>
