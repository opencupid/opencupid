<script setup lang="ts">
import { inject, type Ref } from 'vue'
import type { OwnerProfile, PublicProfile } from '@zod/profile/profile.dto'
import ProfileInteractions from '@/features/interaction/components/ProfileInteractions.vue'
import ProfileContent from '../components/ProfileContent.vue'
import PublicProfileSecondaryNav from '../components/PublicProfileSecondaryNav.vue'

const props = defineProps<{
  profile: PublicProfile
}>()

const emit = defineEmits<{
  (e: 'intent:back'): void
  (e: 'intent:message', conversationId: string): void
  (e: 'intent:block'): void
  (e: 'updated'): void
}>()

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
</script>

<template>
  <div
    :class="{ dating: profile.isDatingActive }"
    class="public-profile h-100"
  >
    <div class="position-relative h-100 overflow-x-hidden">
      <div class="secondary-nav position-absolute w-100 py-2 text-color-white">
        <PublicProfileSecondaryNav
          @intent:back="emit('intent:back')"
          @intent:block="emit('intent:block')"
        />
      </div>
      <div class="profile-content h-100 overflow-auto hide-scrollbar">
        <ProfileContent :profile="profile" />
        <div class="pb-5 spacer" />
      </div>
    </div>
    <div
      class="interactions position-absolute w-100 bottom-0 pb-3"
      v-if="viewerProfile?.id !== profile?.id"
    >
      <ProfileInteractions
        :profile="profile"
        @intent:message="(convoId: string) => emit('intent:message', convoId)"
        @updated="emit('updated')"
      />
    </div>
  </div>
</template>

<style scoped>
.public-profile {
  --panel-bg: var(--bs-body-bg);
}
.public-profile.dating {
  --panel-bg: var(--bs-dating-light);
}

.secondary-nav {
  z-index: 1040;
}
.interactions {
  bottom: 0;
  z-index: 10;
}
.interactions::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5rem;
  background: linear-gradient(to bottom, transparent, var(--panel-bg));
  pointer-events: none;
}
</style>
