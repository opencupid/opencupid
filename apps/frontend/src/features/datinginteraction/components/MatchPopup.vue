<script lang="ts" setup>
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import { type InteractionEdgePair } from '@zod/datinginteraction/datinginteraction.dto';

defineProps<{
  match: InteractionEdgePair
  show: boolean
}>()
</script>

<template>
  <BModal
    :model-value="show"
    size="md"
    fullscreen="md"
    centered
    variant="dating"
    :focus="false"
    :no-close-on-backdrop="true"
    :no-footer="true"
    :no-header="false"
    initial-animation
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden p-0"
    :keyboard="false"
  >
    <div class="w-100 bg-dating">
      <h1>It's a match!</h1>
      <div
        class="d-flex flex-row align-items-center justify-content-center gap-3"
        style="height: 3rem"
      >
        <ProfileThumbnail :profile="match.from.profile" />
        <ProfileThumbnail :profile="match.to.profile" />
      </div>
    </div>
  </BModal>
</template>
