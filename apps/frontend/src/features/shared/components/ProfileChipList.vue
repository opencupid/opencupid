<script setup lang="ts">
import { type ProfileSummary } from '@zod/profile/profile.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

defineProps<{ profiles: ProfileSummary[] }>()
</script>

<template>
  <BListGroup>
    <BListGroupItem
      v-for="profile in profiles"
      href="#"
      :key="profile.id"
      flush
      class="profilechip d-flex align-items-center mb-1 p-1 border-0 rounded-3 cursor-pointer user-select-none"
      @click="$emit('select:profile', profile.id)"
    >
      <ProfileThumbnail
        :profile="profile"
        class="me-2 flex-shrink-0"
      />
      <div class="text-truncate fw-bold">{{ profile.publicName }}</div>
    </BListGroupItem>
  </BListGroup>
</template>
