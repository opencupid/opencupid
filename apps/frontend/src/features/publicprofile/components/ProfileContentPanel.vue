<script setup lang="ts">
import type { PublicProfile } from '@zod/profile/profile.dto'
import ProfileContent from './ProfileContent.vue'

defineProps<{ profile: PublicProfile }>()
</script>

<template>
  <div class="h-100 overflow-auto hide-scrollbar">
    <ProfileContent :profile="profile" />
    <div class="pb-5" />
  </div>
</template>
