<script setup lang="ts">
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { ProfileSummary } from '@zod/profile/profile.dto'

defineProps<{
  profile: ProfileSummary
}>()
</script>

<template>
  <div
    class="ratio ratio-1x1 clickable like-card"
    role="button"
    tabindex="0"
  >
    <div class="dating rounded-3 d-flex flex-column align-items-center justify-content-center p-2">
      <ProfileThumbnail
        v-if="profile.profileImages[0]"
        :profile="profile"
        class="avatar-chip dating-eligible-highlight"
      />
      <small class="mt-1 text-truncate w-100 text-center">
        {{ profile.publicName }}
      </small>
    </div>
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

.like-card:hover {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  border-radius: var(--bs-border-radius-lg);
}
</style>
