<script lang="ts" setup>
import { computed, inject, type Ref } from 'vue'

import { type OwnerProfile, type PublicProfile } from '@zod/profile/profile.dto'

import ImageCarousel from './ImageCarousel.vue'
import GenderPronounLabel from '@/features/shared/profiledisplay/GenderPronounLabel.vue'
import RelationshipTags from '@/features/shared/profiledisplay/RelationshipTags.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

const props = defineProps<{
  profile: PublicProfile
}>()

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const viewerLocation = computed(() => viewerProfile?.value?.location)
</script>

<template>
  <div class="position-relative">
    <div class="overflow-hidden carousel-wrapper">
      <ImageCarousel :images="profile.profileImages" />
    </div>

    <div class="icons">
      <!-- <DatingIcon :profile /> -->
    </div>

    <div
      class="action-buttons"
      v-if="$slots['photo-edit']"
    >
      <slot name="photo-edit" />
    </div>

    <div class="mx-3">
      <div class="d-flex flex-row align-items-center mt-2">
        <div class="flex-grow-1 d-inline-flex align-items-center">
          <span class="fw-bolder fs-2 me-1">{{ props.profile.publicName }}</span>
          <slot name="name-edit" />
        </div>
        <GenderPronounLabel :profile="props.profile" />
      </div>
      <div class="mb-2 text-muted d-inline-flex align-items-center">
        <span class="me-1">
          <LocationLabel
            :viewerLocation="viewerLocation"
            :location="profile.location"
            :showCity="true"
            :showCountryLabel="true"
            :showCountryIcon="false"
          />
        </span>
        <slot name="location-edit" />
      </div>

      <div class="mb-3">
        <div class="d-inline-flex align-items-center flex-wrap">
          <TagList :tags="profile.tags" />
          <slot name="tags-edit" />
        </div>

        <div class="d-inline-flex align-items-center">
          <LanguageList :languages="profile.languages" />
          <slot name="languages-edit" />
        </div>
      </div>
      <div class="mb-3">
        <slot name="intro-social">{{ props.profile.introSocial }}</slot>
      </div>

      <div class="mb-3 dating-field">
        <div
          class="mb-3"
          v-if="props.profile.isDatingActive"
        >
          <span class="opacity-25">
            <hr />
          </span>
          <slot name="intro-dating">{{ props.profile.introDating }}</slot>
        </div>
        <div class="mb-3">
          <RelationshipTags :profile="props.profile" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icons {
  position: absolute;
  top: 0.5rem;
  right: 1rem;
  z-index: 5;
}

.action-buttons {
  position: absolute;
  margin-top: -4rem;
  right: 1rem;
  z-index: 5;
}
</style>
