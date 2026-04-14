<script setup lang="ts">
import { type ProfileSummary } from '@zod/profile/profile.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

defineProps<{ profiles: ProfileSummary[] }>()
</script>

<template>
  <BListGroup flush>
    <BListGroupItem
      v-for="profile in profiles"
      href="#"
      :key="profile.id"
      class="profilechip d-flex align-items-center mb-2 p-0 border-0 rounded-3 cursor-pointer user-select-none"
      @click="$emit('select:profile', profile)"
    >
      <ProfileThumbnail
        :profile="profile"
        class="me-2 flex-shrink-0"
      />
      <div class="text-truncate fw-bold">{{ profile.publicName }}</div>
    </BListGroupItem>
  </BListGroup>
</template>
