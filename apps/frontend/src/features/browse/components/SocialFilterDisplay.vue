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
    class="d-flex align-items-center justify-content-between w-100 clickable bg-secondary rounded-2 px-2 py-1 text-white"
    @click="$emit('prefs:toggle')"
  >
    <div class="flex-grow-1">
      <span class="me-2 ps-1">
        <LocationLabel
          v-if="socialFilter?.location && viewerLocation"
          :location="socialFilter.location"
          :viewerLocation="viewerLocation"
          :showCity="true"
          :showCountryLabel="true"
          :showCountryIcon="false"
        />
        <span v-if="!socialFilter?.location.country">
          <!-- Anywhere -->
          {{ $t('profiles.browse.filters.anywhere') }}
        </span>
      </span>

      <TagList v-if="socialFilter?.tags.length" :tags="socialFilter.tags" />
    </div>

    <div class="flex-shrink-1">
      <BButton variant="link" pill class="text-white py-0 ms-2"
      :title="$t('profiles.browse.filters.search_button_title_social')">
        <IconSearch class="svg-icon" />
      </BButton>
    </div>
  </div>
</template>
