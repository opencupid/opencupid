<script setup lang="ts">
import type { PublicProfile } from '@zod/profile/profile.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import DatingIcon from '@/components/profiles/display/DatingIcon.vue'
import LanguageList from '@/components/profiles/display/LanguageList.vue'
import TagList from '@/components/profiles/display/TagList.vue'
import LocationLabel from '@/components/profiles/display/LocationLabel.vue'
// Props & Emits
defineProps<{
  profile: PublicProfile
}>()
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
        <small>
          <LocationLabel :location="profile.location" :showCity="false" :showCountryLabel="false" />
        </small>
      </div>
      <div class="p-2 flex-grow-1">
        <TagList :profile />
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
