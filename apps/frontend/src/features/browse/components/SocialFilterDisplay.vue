<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { type SocialMatchFilterDTO } from '@zod/match/filters.dto'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import type { PublicTag } from '@zod/tag/tag.dto'
import IconSetting from '@/assets/icons/interface/setting.svg'
import IconSquare from '@/assets/icons/interface/square.svg'
import IconMap from '@/assets/icons/interface/map.svg'
import IconSearch from '@/assets/icons/interface/search.svg'

const socialFilter = defineModel<SocialMatchFilterDTO | null>({
  default: null,
})
const props = defineProps<{
  viewerLocation?: LocationDTO | null
  prefsButtonDisabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'prefs:toggle'): void
  (event: 'filter:changed'): void
}>()

function removeTag(tag: PublicTag) {
  if (socialFilter.value) {
    socialFilter.value.tags = socialFilter.value.tags.filter(
      (t) => t.slug !== tag.slug,
    )
    emit('filter:changed')
  }
}

function clearLocation() {
  if (socialFilter.value) {
    Object.assign(socialFilter.value.location, {
      country: '',
      cityId: '',
      cityName: '',
      lat: null,
      lon: null,
    })
    emit('filter:changed')
  }
}
</script>

<template>
  <BButton
    variant="primary"
    pill
    :title="$t('profiles.browse.filters.search_button_title_social')"
    @click="$emit('prefs:toggle')"
  >
    <!-- <IconSearch class="svg-icon" /> -->
    <IconSetting class="svg-icon" />
  </BButton>
  <span class="ms-2 d-none">
    <!-- Looking:  -->
    {{ $t('profiles.browse.filters.filter_display_label') }}
  </span>
  <div class="filter-chips flex-grow-1 ms-2">
    <span class="filter-chip badge text-bg-info me-1">
      <template v-if="socialFilter?.location?.country && viewerLocation">
        <LocationLabel
          :location="socialFilter.location"
          :viewerLocation="viewerLocation"
          :showCity="false"
          :showCountryLabel="true"
          :showCountryIcon="false"
        />
        <button
          type="button"
          class="btn-close btn-close-sm ms-1"
          aria-label="Remove"
          @click="clearLocation"
        />
      </template>
      <template v-else>
        {{ $t('profiles.browse.filters.anywhere') }}
      </template>
    </span>

    <span
      v-for="tag in socialFilter?.tags"
      :key="tag.slug"
      class="filter-chip badge text-bg-warning me-1"
    >
      #{{ tag.name }}
      <button
        type="button"
        class="btn-close btn-close-sm ms-1"
        aria-label="Remove"
        @click="removeTag(tag)"
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
