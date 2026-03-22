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
    class="public-profile"
  >
    <div class="min-h-100 position-relative">
      <div class="secondary-nav position-absolute w-100 py-2 text-color-white">
        <PublicProfileSecondaryNav
          @intent:back="emit('intent:back')"
          @intent:block="emit('intent:block')"
        />
      </div>

      <ProfileContent
        :profile="profile"
        class="mb-5"
      />

      <div class="interactions position-fixed w-100">
        <ProfileInteractions
          :profile="profile"
          @intent:message="(convoId: string) => emit('intent:message', convoId)"
          @updated="emit('updated')"
          @passed="emit('updated')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.secondary-nav {
  z-index: 1040;
}
.interactions {
  bottom: 1rem;
  left: 0;
  z-index: 2;
}
</style>
