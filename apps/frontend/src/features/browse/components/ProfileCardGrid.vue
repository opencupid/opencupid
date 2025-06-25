<script setup lang="ts">
import ProfileCardComponent from './ProfileCardComponent.vue'
import { type PublicProfile } from '@zod/profile/profile.dto'

defineProps<{
  profiles: PublicProfile[]
}>()

defineEmits<{
  (event: 'profile:select', id: string): void
}>()
</script>

<template>
  <div v-for="profile in profiles" :key="profile.id" class="col">
    <ProfileCardComponent :profile @click="$emit('profile:select', profile.id)" />
  </div>
</template>
