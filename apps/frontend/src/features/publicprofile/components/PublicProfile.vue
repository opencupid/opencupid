<script setup lang="ts">
import { inject, type Ref } from 'vue'
import type { OwnerProfile, PublicProfile } from '@zod/profile/profile.dto'
import ProfileInteractions from '@/features/interaction/components/ProfileInteractions.vue'
import ProfileContent from '../components/ProfileContent.vue'
import ProfileContentList from '../components/ProfileContentList.vue'
import PublicProfileSecondaryNav from '../components/PublicProfileSecondaryNav.vue'

const props = defineProps<{
  profile: PublicProfile
}>()

const emit = defineEmits<{
  (e: 'intent:back'): void
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
        <ProfileContent
          :profile="profile"
          :is-match="profile.isDatingActive"
        />
        <ProfileContentList :profile-id="profile.id" />
        <div class="pb-5 spacer" />
      </div>
    </div>
    <div
      class="interactions position-absolute w-100 bottom-0 pb-3"
      v-if="viewerProfile?.id !== profile?.id"
    >
      <ProfileInteractions
        :profile="profile"
        @updated="emit('updated')"
      />
    </div>
  </div>
</template>

<style scoped>
.public-profile {
  --panel-tint: none;
}
.public-profile.dating {
  --panel-tint: linear-gradient(var(--dating-tint), var(--dating-tint));
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
  /* The panel's own surface, faded in from the top so content scrolls out
     from under the buttons. */
  background-color: var(--bs-body-bg);
  background-image: var(--panel-tint);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000);
  mask-image: linear-gradient(to bottom, transparent, #000);
  pointer-events: none;
}
</style>
