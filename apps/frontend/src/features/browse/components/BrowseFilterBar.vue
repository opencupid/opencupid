<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'

import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
import IconTarget2 from '@/assets/icons/interface/target-2.svg'
import IconTag from '@/assets/icons/e-commerce/tag.svg'

import type { SocialMatchFilterDTO } from '@zod/match/filters.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const FILTER_DEBOUNCE_MS = 500

const filter = defineModel<SocialMatchFilterDTO | null>({ default: null })

const props = defineProps<{
  viewerProfile: OwnerProfile | null
}>()

const emit = defineEmits<{
  'filter:changed': []
  'tagcloud:open': []
}>()

const { t } = useI18n()

function setLocationFromProfile() {
  if (props.viewerProfile?.location && filter.value?.location) {
    Object.assign(filter.value.location, props.viewerProfile.location)
    emit('filter:changed')
  }
}

const debouncedEmitChanged = useDebounceFn(() => emit('filter:changed'), FILTER_DEBOUNCE_MS)

watch(
  () =>
    filter.value && {
      country: filter.value.location.country,
      cityName: filter.value.location.cityName,
      tags: filter.value.tags.map((t) => t.id).join(','),
    },
  (newVal, oldVal) => {
    if (!oldVal || !newVal) return
    if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
      debouncedEmitChanged()
    }
  }
)
</script>

<template>
  <div
    class="filter-area flex-grow-1"
    @click.stop
  >
    <div
      class="row g-2"
      v-if="filter"
    >
      <!-- Location column -->
      <div class="col-12 col-md-6">
        <div class="d-flex align-items-center gap-2">
          <BButton
            variant="link-secondary"
            size="sm"
            class="p-0"
            :title="t('profiles.browse.filters.locate_button_title')"
            @click="setLocationFromProfile"
          >
            <IconTarget2 class="svg-icon-lg" />
          </BButton>
          <div class="flex-grow-1">
            <LocationSelector
              v-model="filter.location"
              open-direction="bottom"
              :allow-empty="true"
              :close-on-select="true"
            />
          </div>
        </div>
      </div>
      <!-- Tags column -->
      <div class="col-12 col-md-6">
        <div class="d-flex align-items-center gap-2">
          <div class="flex-grow-1">
            <TagSelector
              v-model="filter.tags"
              :taggable="false"
              open-direction="bottom"
              :close-on-select="true"
              :initialOptions="viewerProfile?.tags ?? []"
            />
          </div>
          <BButton
            variant="link-secondary"
            size="sm"
            class="p-0"
            @click="$emit('tagcloud:open')"
            :title="t('profiles.browse.filters.explore_tags')"
          >
            <IconTag class="svg-icon-lg" />
          </BButton>
        </div>
      </div>
    </div>
  </div>
</template>
