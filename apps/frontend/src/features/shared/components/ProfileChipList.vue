<script setup lang="ts">
import { type ProfileSummary } from '@zod/profile/profile.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

defineProps<{ profiles: ProfileSummary[] }>()
defineEmits<{
  (e: 'select:profile', profileId: string): void
}>()
</script>

<template>
  <BListGroup>
    <BListGroupItem
      v-for="profile in profiles"
      :key="profile.id"
      variant="light"
      class="d-flex align-items-center mb-3 p-2 border-0 rounded-3 shadow cursor-pointer user-select-none"
      @click="$emit('select:profile', profile.id)"
    >
      <div class="me-2 flex-shrink-0">
        <ProfileThumbnail :profile="profile" />
      </div>
      <div class="text-truncate fw-bold">{{ profile.publicName }}</div>
    </BListGroupItem>
  </BListGroup>
</template>
