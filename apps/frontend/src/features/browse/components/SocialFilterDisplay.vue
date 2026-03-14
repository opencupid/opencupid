<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { type SocialMatchFilterDTO } from '@zod/match/filters.dto'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import type { PublicTag } from '@zod/tag/tag.dto'

const matchFilter = defineModel<SocialMatchFilterDTO | null>({
  default: null,
})
const props = defineProps<{
  viewerLocation?: LocationDTO | null
}>()

const emit = defineEmits<{
  (event: 'filter:changed'): void
}>()

function removeTag(tag: PublicTag) {
  if (matchFilter.value) {
    matchFilter.value.tags = matchFilter.value.tags.filter((t) => t.slug !== tag.slug)
    emit('filter:changed')
  }
}
</script>

<template>
  <div class="filter-chips flex-grow-1">
    <span
      class="filter-chip badge text-bg-info me-1"
      v-if="matchFilter?.location?.country && viewerLocation"
    >
      <LocationLabel
        :location="matchFilter.location"
        :viewerLocation="viewerLocation"
        :showCity="false"
        :showCountryLabel="true"
        :showCountryIcon="false"
      />
    </span>

    <span
      v-for="tag in matchFilter?.tags"
      :key="tag.slug"
      class="filter-chip badge text-bg-warning me-1"
    >
      #{{ tag.name }}
      <button
        type="button"
        class="btn-close btn-close-sm ms-1"
        aria-label="Remove"
        @click.stop="removeTag(tag)"
      />
    </span>
  </div>
</template>

<style lang="css" scoped>
.filter-chips {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
}
.filter-chip .btn-close {
  font-size: 0.5em;
  padding: 0.3em;
  filter: invert(1);
  opacity: 0.7;
}
.filter-chip .btn-close:hover {
  opacity: 1;
}
</style>
