<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import PostIt from '@/features/shared/ui/PostIt.vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import PostTypeBadge from './PostTypeBadge.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import { UseTimeAgo } from '@vueuse/components'

const props = defineProps<{
  item: PublicPostWithProfile | OwnerPost
}>()

const ownerProfile = inject<Ref<OwnerProfile | null>>('ownerProfile', ref(null))
const viewerLocation = computed(() => ownerProfile?.value?.location ?? undefined)

const hasProfileData = (post: any): post is PublicPostWithProfile => {
  return 'postedBy' in post && post.postedBy != null
}

const postLocation = computed(() => {
  if ('location' in props.item && props.item.location) {
    const loc = props.item.location
    return {
      country: loc.country ?? '',
      cityName: loc.cityName ?? undefined,
      lat: loc.lat ?? undefined,
      lon: loc.lon ?? undefined,
    }
  }
  return null
})
</script>

<template>
  <div class="post-wrapper position-relative w-100">
    <PostIt class="position-relative p-2" :id="item.id" variant="">
      <template #header>
        <div class="d-flex justify-content-end align-items-center">
          <PostTypeBadge :type="item.type" />
        </div>
      </template>

      <div class="post-card d-flex flex-column" :class="`post-card--${item.type.toLowerCase()}`" @click="$emit('click', item.id)">
        <p class="post-content flex-grow-1 flex-shrink-1">{{ item.content }}</p>

        <div class="post-meta d-flex align-items-center justify-content-start gap-2">
          <div class="text-muted flex-shrink-0">
            <div class="d-flex justify-content-start flex-row align-items-center">
              <div v-if="hasProfileData(item)" class="d-flex align-items-center">
                <ProfileThumbnail :profile="item.postedBy" class="me-2" />
                <div>{{ item.postedBy.publicName }}</div>
              </div>
              <div>
                <UseTimeAgo v-slot="{ timeAgo }" :time="item.createdAt"> | {{ timeAgo }} </UseTimeAgo>
              </div>
            </div>
          </div>

          <div class="location d-flex flex-shrink-1 flex-grow-1 min-w-0 justify-content-end">
            <span v-if="postLocation" class="post-location text-muted">
              <LocationLabel 
                :viewerLocation="viewerLocation"
                :location="postLocation" 
                :show-country-label="false"
                :show-city="true"
                :show-country-icon="true" 
                :show-only-foreign-country="true" />
            </span>
          </div>
        </div>
      </div>
    </PostIt>
  </div>
</template>

<style scoped>
.post-content {
  max-height: 5rem;
  overflow: hidden;
  font-size: 0.85rem;
}

.post-meta {
  font-size: 0.7rem;
}

.post-location {
  font-size: 0.65rem;
}

.post-card {
  cursor: pointer;
}
</style>
