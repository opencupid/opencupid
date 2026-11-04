<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BrowseListItem } from '@zod/browse/browseList.dto'

import ProfileMapCard from './ProfileMapCard.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import UserContentCard from '@/features/userContent/components/UserContentCard.vue'
import IconPin from '@/assets/icons/interface/pin.svg'
import IconHeart from '@/assets/icons/interface/heart.svg'

const props = defineProps<{ item: BrowseListItem }>()

const emit = defineEmits<{
  select: []
  locate: []
  /** Pointer entered (true) or left (false) the card. */
  hover: [active: boolean]
}>()

const { t, locale } = useI18n()

/** A potential dating match: halo and heart, as on the profile's map pin. */
const isMatch = computed(() => props.item.kind === 'profile' && props.item.highlighted)

const eventStartsAt = computed(() =>
  props.item.kind === 'event'
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
        props.item.event.startsAt
      )
    : ''
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
    <div
      class="card-frame position-relative overflow-hidden rounded"
      :class="{ 'card-frame--match': isMatch }"
    >
      <span
        v-if="isMatch"
        class="match-badge position-absolute d-flex rounded-circle"
        role="img"
        :title="t('profiles.dating_match')"
        :aria-label="t('profiles.dating_match')"
      >
        <IconHeart />
      </span>
      <ProfileMapCard
        v-if="item.kind === 'profile'"
        :item="item.profile"
      />
      <PostMapPopup
        v-else-if="item.kind === 'post'"
        :item="item.post"
      />
      <UserContentCard
        v-else-if="item.kind === 'event'"
        :item="item.event"
        kind="event"
      >
        {{ eventStartsAt }}
      </UserContentCard>
      <UserContentCard
        v-else
        :item="item.community"
        kind="community"
      >
        <template v-if="item.community.yearFounded != null">
          {{ t('community.labels.founded_since', { year: item.community.yearFounded }) }}
        </template>
      </UserContentCard>
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

  > :deep(*:not(.locate-button, .match-badge)) {
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

.card-frame--match {
  box-shadow: 0 0 6px 3px rgba(var(--match-rgb), 0.7);
}

.match-badge {
  top: 0.4rem;
  left: 0.4rem;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0.3rem;
  z-index: 2;
  background: white;
  color: rgb(var(--match-rgb));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

  svg {
    width: 100%;
    height: 100%;
  }
}

.locate-button {
  top: 0.4rem;
  right: 0.4rem;
  width: 1.6rem;
  height: 1.6rem;
  z-index: 2;
  opacity: 0.9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

  .svg-icon {
    width: 0.9rem;
    height: 0.9rem;
  }
}
</style>
