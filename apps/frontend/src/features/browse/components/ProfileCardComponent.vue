<script setup lang="ts">
import { inject } from 'vue'
import type { OwnerProfile, PublicProfile } from '@zod/profile/profile.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

// Props & Emits
defineProps<{
  profile: PublicProfile
  showTags?: boolean
  showLocation?: boolean
}>()

const viewerProfile = inject('viewerProfile') as OwnerProfile
const viewerLocation = viewerProfile?.location
</script>

<template>
  <div
    class="card h-100 profile-card cursor-pointer position-relative overflow-hidden d-flex flex-column user-select-none shadow"
    @click="$emit('click', profile.id)"
  >
    <div class="ratio ratio-1x1">
      <ProfileImage :profile="profile" className="" />
    </div>
    <div class="overlay d-flex flex-column flex-grow-1">
      <div class="card-title mb-0 pb-0 d-flex align-items-center justify-content-between flex-row">
        <h5 class="flex-grow-1 fw-bold m-0">{{ profile.publicName }}</h5>
        <span v-if="showLocation" class="location">
          <LocationLabel
            :viewerLocation="viewerLocation"
            :location="profile.location"
            :showCountryLabel="false"
            :showCity="false"
          />
        </span>
      </div>
      <div v-if="showTags" class="p-2 flex-grow-1">
        <TagList :tags="profile.tags" />
      </div>
      <!-- <p class="card-text" :class="{ 'truncated-text': profile.introSocial.length > 100 }">
        {{ profile.introSocial }}
      </p> -->
    </div>
  </div>
</template>

<style scoped lang="scss">
.icons {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.card {
  font-size: 1.25rem;
  &:hover {
    border-color: var(--bs-primary);
  }
}
.card-title {
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  color: var(--bs-light);
  padding: 0.5rem;
  width: 100%;
}

.overlay {
  width: 100%;
  position: absolute;
  bottom: 0rem;
  max-height: 7.25rem;
  background-color: rgba(80, 80, 80, 0.5);
}

.truncated-text {
  position: relative;
  max-height: 8rem;
  overflow: hidden;
}

.truncated-text::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4em;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
  [data-bs-theme='dark'] & {
    background: linear-gradient(to bottom, rgba(33, 37, 41, 0), rgba(33, 37, 41, 1));
  }
  pointer-events: none;
}
</style>
