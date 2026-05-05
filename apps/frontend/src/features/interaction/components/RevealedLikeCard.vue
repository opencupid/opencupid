<script setup lang="ts">
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { ProfileSummary } from '@zod/profile/profile.dto'

defineProps<{
  profile: ProfileSummary
}>()
</script>

<template>
  <div
    class="rounded-3 d-flex flex-column align-items-center justify-content-center gap-2 p-2 h-100"
  >
    <ProfileThumbnail
      v-if="profile.profileImages[0]"
      :profile="profile"
      class="avatar-chip dating-eligible-highlight"
    />
    <small class="publicname w-75 text-truncate text-center d-block">
      {{ profile.publicName }}
    </small>
  </div>
</template>

<style scoped>
.avatar-chip {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.clickable {
  cursor: pointer;
}

.publicname {
  height: 0.75rem;
  font-size: 0.625rem;
  line-height: 0.75rem;
  color: var(--bs-dating);
}
</style>
