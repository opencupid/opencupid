<script setup lang="ts">
import { inject } from 'vue'
import type { PublicEventDetail, OwnerEvent } from '@zod/event/event.dto'

import EventCard from './EventCard.vue'
import IconCross from '@/assets/icons/interface/cross.svg'

import { useRouter } from 'vue-router'
import { isMdUp } from '@/lib/responsive'

const router = useRouter()

defineProps<{
  event: PublicEventDetail | OwnerEvent
}>()

defineEmits<{
  (e: 'close'): void
}>()

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100 h-100 d-flex flex-column">
    <div
      class="d-flex justify-content-end align-items-center w-100 flex-shrink-0"
      v-if="isMdUp"
    >
      <BButton
        variant="link-secondary"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </BButton>
    </div>
    <!--
      The md+ detail panel body is `overflow-hidden`, so content owns its own
      scroll container (matching CommunityFullView). Without this the card is
      clipped instead of scrolling.
    -->
    <div class="event-scroll flex-grow-1 overflow-auto hide-scrollbar">
      <EventCard
        :event="event"
        :show-details="true"
        class="pt-2 pt-md-3 pt-lg-5"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-scroll {
  // Without this a flex child keeps `min-height: auto` and refuses to shrink
  // below its content, so `overflow-auto` would never actually scroll.
  min-height: 0;
}
</style>
