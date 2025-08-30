<script setup lang="ts">
import { ImageVariant } from '@zod/profile/profileimage.dto';
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
    <ProfileImage :profile="profile" context="thumb"/>
  </span>
</template>

<style scoped>
</style>
