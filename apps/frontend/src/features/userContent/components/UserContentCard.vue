<script setup lang="ts">
import { computed } from 'vue'
import type { PublicImage } from '@zod/image/image.dto'
import { CONTENT_KIND_DISPLAY } from '@/features/map/utils/contentKinds'
import UserContentMapPopup from './UserContentMapPopup.vue'
import { splitContentTitle } from '../contentTitle'

/**
 * Grid card for user content, laid out like ProfileMapCard: the name and a
 * meta line sit at the bottom, in a translucent overlay over the first
 * picture, or under the kind's icon on its tinted background when there
 * is no picture. The meta line comes from the default slot.
 */
const props = defineProps<{
  item: { id: string; content: string; images: PublicImage[] }
  kind: 'event' | 'community'
}>()

const display = computed(() => CONTENT_KIND_DISPLAY[props.kind])

const name = computed(() => splitContentTitle(props.item.content).title)
const hasImage = computed(() => props.item.images.length > 0)
</script>

<template>
  <UserContentMapPopup :item="item">
    <template #content>
      <div
        class="d-flex flex-column"
        :class="{ [`h-100 bg-${display.color}-light`]: !hasImage }"
      >
        <div
          v-if="!hasImage"
          class="card-icon flex-grow-1 d-flex align-items-center justify-content-center"
          :class="`text-${display.color}`"
        >
          <component :is="display.icon" />
        </div>
        <div
          class="card-caption p-2"
          :class="{ 'card-overlay': hasImage }"
        >
          <div class="card-name fs-6 fw-bold">{{ name }}</div>
          <div
            class="small"
            :class="{ 'text-secondary': !hasImage }"
          >
            <slot />
          </div>
        </div>
      </div>
    </template>
  </UserContentMapPopup>
</template>

<style scoped lang="scss">
// Same caption placement, overlay and type treatment as ProfileMapCard.
.card-caption {
  font-size: 0.9rem;
}
.card-overlay {
  color: var(--bs-light);
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  background-color: var(--overlay-card);
}
.card-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-icon svg {
  width: 3rem;
  height: 3rem;
  opacity: 0.6;
}
</style>
