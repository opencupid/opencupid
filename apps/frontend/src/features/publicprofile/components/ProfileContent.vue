<script lang="ts" setup>
import { computed, inject, type Ref } from 'vue'

import { type OwnerProfile, type PublicProfile } from '@zod/profile/profile.dto'

import ImageCarousel from './ImageCarousel.vue'
import EmptyProfilePhoto from '@/features/images/components/EmptyProfilePhoto.vue'
import HiddenProfilePhoto from '@/features/images/components/HiddenProfilePhoto.vue'
import { useProfilePhotoAccess } from '@/features/images/composables/useProfilePhotoAccess'
import GenderPronounLabel from '@/features/shared/profiledisplay/GenderPronounLabel.vue'
import RelationshipTags from '@/features/shared/profiledisplay/RelationshipTags.vue'
import LanguageList from '@/features/shared/profiledisplay/LanguageList.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import IconHeartFilled from '@/assets/icons/interface/heart-filled.svg'

const props = defineProps<{
  profile: PublicProfile
  /** A potential dating match of the viewer: a heart after the name. */
  isMatch?: boolean
}>()

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const viewerLocation = computed(() => viewerProfile?.value?.location)

const { canSeePhotosOf } = useProfilePhotoAccess()
// The carousel has no height without images, which would collapse the photo
// area (and the edit button positioned over it) when the gallery is empty.
const firstPhoto = computed(() => props.profile.profileImages[0])
const isHidden = computed(() => !canSeePhotosOf(props.profile))
</script>

<template>
  <div class="position-relative">
    <div class="overflow-hidden carousel-wrapper">
      <div
        v-if="!firstPhoto || isHidden"
        class="ratio ratio-4x3"
      >
        <EmptyProfilePhoto v-if="!firstPhoto" />
        <HiddenProfilePhoto
          v-else
          :photo="firstPhoto"
          icon-corner="bottom-right"
        />
      </div>
      <ImageCarousel
        v-else
        :images="profile.profileImages"
      />
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
          <span
            v-if="isMatch"
            class="match-heart d-inline-flex me-1"
            role="img"
            :title="$t('profiles.dating_match')"
            :aria-label="$t('profiles.dating_match')"
          >
            <IconHeartFilled />
          </span>
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
.match-heart {
  width: 1.4rem;
  height: 1.4rem;
  color: rgb(var(--match-rgb));
}
.match-heart svg {
  width: 100%;
  height: 100%;
}
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
