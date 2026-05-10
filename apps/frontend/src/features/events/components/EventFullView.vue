<script setup lang="ts">
import { inject } from 'vue'
import type { PublicEventDetail, OwnerEvent } from '@zod/event/event.dto'

import EventCard from './EventCard.vue'
import IconCross from '@/assets/icons/interface/cross.svg'

import { useRouter } from 'vue-router'

const router = useRouter()

defineProps<{
  event: PublicEventDetail | OwnerEvent
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', event: PublicEventDetail | OwnerEvent): void
  (e: 'hide', event: PublicEventDetail | OwnerEvent): void
  (e: 'delete', event: PublicEventDetail | OwnerEvent): void
}>()

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100">
    <div class="d-flex justify-content-end align-items-center w-100">
      <BButton
        variant="link-secondary"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </BButton>
    </div>
    <EventCard
      :event="event"
      :show-details="true"
      class="pt-5"
      @edit="emit('edit', event)"
      @hide="emit('hide', event)"
      @delete="emit('delete', event)"
    />
  </div>
</template>
