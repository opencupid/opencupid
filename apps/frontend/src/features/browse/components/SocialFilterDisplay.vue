<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { type SocialMatchFilterDTO } from '@zod/match/filters.dto'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
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

defineEmits<{
  (event: 'prefs:toggle'): void
}>()
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
    <div class="flex-grow-1">
      <strong class="me-2 ps-1">
        <LocationLabel
          v-if="socialFilter?.location && viewerLocation"
          :location="socialFilter.location"
          :viewerLocation="viewerLocation"
          :showCity="false"
          :showCountryLabel="true"
          :showCountryIcon="false"
        />
        <span v-if="!socialFilter?.location.country">
          <!-- Anywhere -->
          {{ $t('profiles.browse.filters.anywhere') }}
        </span>
      </strong>

      <TagList v-if="socialFilter?.tags.length" :tags="socialFilter.tags" />
    </div>
   
</template>


