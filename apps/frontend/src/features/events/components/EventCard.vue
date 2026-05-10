<script setup lang="ts">
import { computed } from 'vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicEvent, OwnerEvent } from '@zod/event/event.dto'
import OwnerToolbar from '@/features/posts/components/OwnerToolbar.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import LocalizedTimeAgo from '@/features/shared/components/LocalizedTimeAgo.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCalendar } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  event: PublicEvent | OwnerEvent
  showDetails: boolean
  dimHidden?: boolean
  showOwnerToolbar?: boolean
}>()

defineEmits<{
  (e: 'click', event: PublicEvent | OwnerEvent): void
  (e: 'edit', event: PublicEvent | OwnerEvent): void
  (e: 'hide', event: PublicEvent | OwnerEvent): void
  (e: 'delete', event: PublicEvent | OwnerEvent): void
}>()

const { d } = useI18n()

const isVisible = computed(() => !('isVisible' in props.event) || props.event.isVisible !== false)
const eventLocation = computed(() => props.event.location ?? null)
const startsAtFormatted = computed(() => d(props.event.startsAt, 'short'))

const GRID_TRUNCATE_LENGTH = 100
const displayContent = computed(() => {
  const content = props.event.content
  if (props.showDetails || content.length <= GRID_TRUNCATE_LENGTH) return content
  const truncated = content.substring(0, GRID_TRUNCATE_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…'
})
</script>

<template>
  <div
    class="event-card p-3 rounded border position-relative"
    :class="{ 'event-card--dim': dimHidden && !isVisible }"
    @click="$emit('click', event)"
  >
    <OwnerToolbar
      v-if="showOwnerToolbar"
      :is-visible="isVisible"
      class="position-absolute top-0 end-0 m-2"
      @edit.stop="$emit('edit', event)"
      @hide.stop="$emit('hide', event)"
      @delete.stop="$emit('delete', event)"
    />

    <div class="d-flex align-items-center mb-2 gap-2">
      <FontAwesomeIcon
        :icon="faCalendar"
        class="text-primary"
      />
      <strong>{{ startsAtFormatted }}</strong>
    </div>

    <p class="mb-2 white-space-pre-line">{{ displayContent }}</p>

    <div class="d-flex align-items-center justify-content-between gap-2 small text-muted">
      <div class="d-flex align-items-center gap-2">
        <ProfileThumbnail
          :profile="event.postedBy"
          size="sm"
        />
        <span>{{ event.postedBy.publicName }}</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <LocationLabel
          v-if="eventLocation"
          :location="eventLocation"
        />
        <LocalizedTimeAgo :date="event.createdAt" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-card {
  background-color: var(--bs-body-bg);
}
.event-card--dim {
  opacity: 0.5;
}
.white-space-pre-line {
  white-space: pre-line;
}
</style>
