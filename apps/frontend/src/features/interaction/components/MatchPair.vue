<script setup lang="ts">
// Two overlapping round avatars standing for a match between two profiles.
import type { ImageVariant } from '@zod/image/image.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'

type PairProfile = {
  id: string
  profileImages: { variants: ImageVariant[]; blurhash?: string | null }[]
}

defineProps<{
  left: PairProfile
  right: PairProfile
}>()
</script>

<template>
  <div class="d-flex flex-row align-items-center justify-content-center">
    <div class="image-wrapper">
      <ProfileImage
        :profile="left"
        variant="thumb"
      />
    </div>
    <div class="image-wrapper right">
      <ProfileImage
        :profile="right"
        variant="thumb"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.image-wrapper {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.8);
}
.right {
  margin-left: -1.5rem;
  margin-right: 0;
}
</style>
