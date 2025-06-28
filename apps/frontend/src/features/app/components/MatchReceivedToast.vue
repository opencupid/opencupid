<script setup lang="ts">
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import { type InteractionEdge } from '@zod/datinginteraction/datinginteraction.dto'
// import { useI18n } from 'vue-i18n';
// const { t } = useI18n()

defineEmits<{
  (e: 'closeToast'): void
}>()

defineProps<{
  edge: InteractionEdge
  toastId: number | string
}>()
</script>

<template>
  <div class="d-flex align-items-center clickable">
    <div class="profile-thumbnail me-2">
      <ProfileImage :profile="edge.profile" />
    </div>
    <span>
      You matched with {{ edge.profile.publicName || 'someone' }}!
    </span>
  </div>
</template>
