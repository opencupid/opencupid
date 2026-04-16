<script setup lang="ts">
import { inject, type Ref, computed } from 'vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import IconTag from '@/assets/icons/e-commerce/tag.svg'

import type { PublicTag } from '@zod/tag/tag.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { GeocodingResult } from '@/features/geocoding/stores/geocodingStore'

import SelectableTagList from './SelectableTagList.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

const props = defineProps<{
  tags: PublicTag[]
  geocodedLocations?: GeocodingResult[]
}>()

defineEmits<{
  'tag:select': [tag: PublicTag]
  'location:select': [location: LocationDTO]
}>()

const geocodedAsLocations = computed<LocationDTO[]>(() =>
  (props.geocodedLocations ?? []).map((r) => ({
    country: r.country,
    cityName: r.name,
    lat: r.lat,
    lon: r.lon,
  }))
)

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
const viewerLocation = computed(() => viewerProfile?.value?.location)
</script>

<template>
  <div class="search-refiners d-flex flex-column">
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
      v-if="tags.length"
      class="px-2 pb-2 d-flex align-items-start"
    >
      <IconTag
        width="24"
        height="24"
        class="mt-1 me-2 text-secondary flex-shrink-0"
      />
      <SelectableTagList
        :tags="tags"
        selectable
        @select="$emit('tag:select', $event)"
      />
    </section>
  </div>
</template>
