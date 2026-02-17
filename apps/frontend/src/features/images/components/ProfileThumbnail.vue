<script setup lang="ts">
import { type ImageVariant } from '@zod/profile/profileimage.dto'
import ProfileImage from './ProfileImage.vue'

// Props & Emits
defineProps<{
  profile: {
    profileImages: { variants: ImageVariant[] }[]
  }
}>()
</script>

<template>
  <span class="profile-thumbnail d-inline-flex">
    <ProfileImage
      :profile="profile"
      variant="thumb"
    />
  </span>
</template>

<style scoped></style>
