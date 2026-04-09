<script setup lang="ts">
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import ProfileInteractions from '@/features/interaction/components/ProfileInteractions.vue'
import ProfileContent from '../components/ProfileContent.vue'
import PublicProfileSecondaryNav from '../components/PublicProfileSecondaryNav.vue'

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const emit = defineEmits<{
  (e: 'intent:back'): void
  (e: 'intent:message', conversationId: string): void
  (e: 'intent:block'): void
  (e: 'updated'): void
}>()
</script>

<template>
  <div
    :class="{ dating: profile.isDatingActive }"
    class="public-profile h-100"
  >
    <div class="position-relative h-100">
      <div class="secondary-nav position-absolute w-100 py-2 text-color-white">
        <PublicProfileSecondaryNav
          @intent:back="emit('intent:back')"
          @intent:block="emit('intent:block')"
        />
      </div>
      <div class="profile-content h-100 overflow-auto">
        <ProfileContent :profile="profile" />
      </div>
    </div>
    <div class="interactions position-absolute w-100 bottom-0 pb-3">
      <ProfileInteractions
        :profile="profile"
        @intent:message="(convoId: string) => emit('intent:message', convoId)"
        @updated="emit('updated')"
        @passed="emit('updated')"
      />
    </div>
  </div>
</template>

<style scoped>
.secondary-nav {
  z-index: 1040;
}
.interactions {
  bottom: 0;
  z-index: 2;
}
</style>
