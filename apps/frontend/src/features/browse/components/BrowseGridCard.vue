<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BrowseListItem } from '@zod/browse/browseList.dto'

import ProfileMapCard from './ProfileMapCard.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import EventMapPopup from '@/features/events/components/EventMapPopup.vue'
import CommunityMapPopup from '@/features/community/components/CommunityMapPopup.vue'
import IconPin from '@/assets/icons/interface/pin.svg'

const props = defineProps<{ item: BrowseListItem }>()

const emit = defineEmits<{
  select: []
  locate: []
  /** Pointer entered (true) or left (false) the card. */
  hover: [active: boolean]
}>()

const { t, locale } = useI18n()

const distance = computed(() =>
  t('profiles.browse.grid.distance_km', {
    distance: new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(
      props.item.distanceKm
    ),
  })
)
</script>

<template>
  <div
    class="browse-grid-card"
    role="button"
    tabindex="0"
    @click="emit('select')"
    @keydown.enter="emit('select')"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
  >
    <div class="card-frame position-relative overflow-hidden rounded">
      <ProfileMapCard
        v-if="item.kind === 'profile'"
        :item="item.profile"
      />
      <PostMapPopup
        v-else-if="item.kind === 'post'"
        :item="item.post"
      />
      <EventMapPopup
        v-else-if="item.kind === 'event'"
        :item="item.event"
      />
      <CommunityMapPopup
        v-else
        :item="item.community"
      />
      <button
        type="button"
        class="locate-button btn btn-light btn-sm rounded-circle position-absolute d-flex align-items-center justify-content-center p-0"
        :aria-label="t('profiles.browse.grid.show_on_map')"
        :title="t('profiles.browse.grid.show_on_map')"
        @click.stop="emit('locate')"
      >
        <IconPin class="svg-icon" />
      </button>
    </div>
    <div class="small text-muted mt-1 text-end">{{ distance }}</div>
  </div>
</template>

<style scoped lang="scss">
.browse-grid-card {
  cursor: pointer;
  min-width: 0;
}

// The map popup cards are built around a square image. In the grid every
// card gets the same 4:5 frame so rows line up across content types.
.card-frame {
  aspect-ratio: 4 / 5;
  max-width: 100%;
  background-color: var(--bs-tertiary-bg);

  > :deep(*:not(.locate-button)) {
    height: 100%;
  }
  :deep(.ratio) {
    --bs-aspect-ratio: 125%;
  }
  // Text-only content (no image): let the coloured block fill the frame.
  :deep(.popup-content:only-child),
  :deep(.popup-content:only-child > *) {
    height: 100%;
  }
}

.locate-button {
  top: 0.4rem;
  right: 0.4rem;
  width: 2rem;
  height: 2rem;
  z-index: 2;
  opacity: 0.9;
}
</style>
