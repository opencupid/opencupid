<script setup lang="ts">
import { inject, type Ref, computed } from 'vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import IconPostIt from '@/assets/icons/interface/post-it.svg'
import IconTag from '@/assets/icons/e-commerce/tag.svg'

import type { PublicTag } from '@zod/tag/tag.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import type { PostSummary } from '@zod/post/post.dto'
import type { OwnerProfile, ProfileSummary } from '@zod/profile/profile.dto'
import type { SearchResponse } from '@shared/zod/search/search.dto'
import type { GeocodingResult } from '@/features/geocoding/stores/geocodingStore'

import ProfileChipList from './ProfileChipList.vue'
import SelectableTagList from './SelectableTagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

const props = defineProps<{
  results: SearchResponse
  geocodedLocations?: GeocodingResult[]
}>()

const geocodedAsLocations = computed<LocationDTO[]>(() =>
  (props.geocodedLocations ?? []).map((r) => ({
    country: r.country,
    cityName: r.name,
    lat: r.lat,
    lon: r.lon,
  }))
)

defineEmits<{
  'tag:select': [tag: PublicTag]
  'post:select': [post: PostSummary]
  'profile:select': [profile: ProfileSummary]
  'location:select': [location: LocationDTO]
}>()

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const viewerLocation = computed(() => viewerProfile?.value?.location)
</script>

<template>
  <div class="search-results d-flex flex-column">
  
    <section v-if="geocodedAsLocations.length">
      <BListGroup flush>
        <BListGroupItem
          v-for="(loc, i) in geocodedAsLocations"
          class="small border-0 mb-0 px-2 py-1"
          :key="`geo-${loc.country}-${loc.cityName ?? ''}-${i}`"
          @click="$emit('location:select', loc)"
          button
        >
          <FontAwesomeIcon
            :icon="faLocationDot"
            class="me-2 text-secondary"
          />

          <LocationLabel
            :viewerLocation="viewerLocation"
            :location="loc"
            :showOnlyForeignCountry="true"
            :showCountryIcon="false"
          />
        </BListGroupItem>
      </BListGroup>
    </section>

    <section
      v-if="results.tags.length"
      class="px-2 pb-2 d-flex align-items-start"
    >
      <IconTag
        width="24"
        height="24"
        class="mt-1 me-2 text-secondary flex-shrink-0"
      />
      <SelectableTagList
        :tags="results.tags"
        selectable
        @select="$emit('tag:select', $event)"
      />
    </section>

    <section
      v-if="results.profiles.length"
      class="px-2"
    >
      <ProfileChipList
        :profiles="results.profiles"
        @select:profile="(profile: ProfileSummary) => $emit('profile:select', profile)"
      />
    </section>

    <section
      v-if="results.posts.length"
      class="px-2 pb-2 d-flex align-items-start"
    >
      <IconPostIt
        width="24"
        height="24"
        class="mt-1 me-2 text-secondary flex-shrink-0"
      />

      <BListGroup flush>
        <BListGroupItem
          v-for="post in results.posts"
          class="bg-post-it small"
          button
          :key="post.id"
          @click="$emit('post:select', post)"
        >
          <div class="small lh-sm text-truncate">
            {{ post.content }}
            <!-- <div class="text-secondary text-end">{{ post.postedBy.publicName }}</div> -->
          </div>
        </BListGroupItem>
      </BListGroup>
    </section>

    <div
      v-if="
        !results.tags.length &&
        !results.profiles.length &&
        !results.posts.length &&
        !results.locations.length &&
        !geocodedAsLocations.length
      "
      class="text-center text-secondary small py-3"
    >
      No results
    </div>
  </div>
</template>
