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
  <BContainer>
    <BRow v-bind="{ cols: 1, 'cols-sm': 2, 'gutter-y': 4, ...$attrs }">
      <BCol v-for="profile in profiles" :key="profile.id" class="col">
        <ProfileCardComponent :profile @click="$emit('profile:select', profile.id)" />
      </BCol>
    </BRow>
  </BContainer>
</template>
