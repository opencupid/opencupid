<script lang="ts">
const loadedUrls = new Set<string>()
export default { __test_loadedUrls: loadedUrls }
</script>

<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'
import type { OwnerProfile, PublicProfile } from '@zod/profile/profile.dto'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import BlurhashCanvas from '@/features/images/components/BlurhashCanvas.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

// Props & Emits
const props = defineProps<{
  profile: PublicProfile
  showTags?: boolean
  showLocation?: boolean
}>()

const primaryUrl =
  props.profile.profileImages?.[0]?.variants?.find((v) => v.size === 'card')?.url ?? null

const alreadyCached = primaryUrl ? loadedUrls.has(primaryUrl) : true
const imageLoaded = ref(alreadyCached)

const handleImageLoad = () => {
  imageLoaded.value = true
  if (primaryUrl) loadedUrls.add(primaryUrl)
}

const primaryBlurhash = ref(props.profile.profileImages?.[0]?.blurhash ?? null)

const viewerProfile = inject<Ref<OwnerProfile>>('viewerProfile')
const viewerLocation = ref(viewerProfile?.value.location)
</script>

<template>
  <div
    class="card h-100 profile-card cursor-pointer position-relative overflow-hidden d-flex flex-column user-select-none shadow"
    @click="$emit('click', profile.id)"
  >
    <div class="ratio ratio-1x1">
      <BlurhashCanvas
        v-if="primaryBlurhash"
        :blurhash="primaryBlurhash"
        class="blurhash-placeholder"
      />
      <ProfileImage
        :profile="profile"
        className=""
        variant="card"
        class="card-image"
        :class="{ 'card-image-loaded': imageLoaded, 'card-image-cached': alreadyCached }"
        @load="handleImageLoad"
      />
    </div>
    <div class="overlay d-flex flex-column flex-grow-1">
      <div class="card-title mb-0 pb-0 d-flex align-items-center justify-content-between flex-row">
        <div class="flex-grow-1 fs-6 fw-bold m-0">{{ profile.publicName }}</div>
        <span
          v-if="showLocation"
          class="location position-absolute end-0 top-0 me-2 mt-2"
        >
          <LocationLabel
            :viewerLocation="viewerLocation"
            :location="profile.location"
            :showCountryLabel="false"
            :showCity="false"
            :showOnlyForeignCountry="true"
          />
        </span>
      </div>
      <div
        v-if="showTags"
        class="p-2 flex-grow-1 tags-wrapper"
      >
        <TagList :tags="profile.tags" />
      </div>
      <!-- <p class="card-text" :class="{ 'truncated-text': profile.introSocial.length > 100 }">
        {{ profile.introSocial }}
      </p> -->
    </div>
  </div>
</template>

<style scoped lang="scss">
.blurhash-placeholder {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.icons {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.card-image {
  opacity: 0;
  transition: opacity 0.3s ease-in;
  z-index: 2;

  &.card-image-loaded {
    opacity: 1;
  }

  &.card-image-cached {
    transition: none;
  }
}

.card {
  font-size: 0.9rem;
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
  max-height: 4rem;
  background-color: rgba(80, 80, 80, 0.5);
  z-index: 3;
}
.tags-wrapper {
  font-size: 0.75rem;
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
