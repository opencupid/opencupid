<script setup lang="ts">
import ProfileImage from './ProfileImage.vue'

// Props & Emits
defineProps<{
  profile: {
    profileImages: { variants: { size: string; url: string }[] }[]
  }
}>()
</script>

<template>
  <span class="profile-thumbnail d-inline-flex">
    <ProfileImage :profile="profile" />
  </span>
</template>

<style scoped>
</style>
