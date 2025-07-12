<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { type SocialMatchFilterDTO } from '@zod/match/filters.dto'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'
import IconSetting from '@/assets/icons/interface/setting.svg'
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
  <div
    class="d-flex align-items-center justify-content-between w-100 clickable px-2 py-1 bg-light rounded"
    @click="$emit('prefs:toggle')"
  >
    <span>
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

    <BButton
      variant="primary"
      pill
      :title="$t('profiles.browse.filters.search_button_title_social')"
    >
      <!-- <IconSearch class="svg-icon" /> -->
      <IconSetting class="svg-icon" />
    </BButton>

    <!-- <div class="flex-shrink-1">
      <BButton variant="primary" pill class="ms-2"
      :title="$t('profiles.browse.filters.search_button_title_social')">
         <IconSetting class="svg-icon" />
      </BButton>
    </div> -->
  </div>
</template>
