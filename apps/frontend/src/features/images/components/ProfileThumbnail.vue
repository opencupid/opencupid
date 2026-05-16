<script setup lang="ts">
import { type ImageVariant } from '@zod/image/image.dto'
import GalleryImage from './GalleryImage.vue'

// Props & Emits
defineProps<{
  profile: {
    profileImages: { variants: ImageVariant[] }[]
  }
}>()
</script>

<template>
  <span class="profile-thumbnail d-inline-flex">
    <GalleryImage
      :profile="profile"
      variant="thumb"
    />
  </span>
</template>

<style scoped></style>
