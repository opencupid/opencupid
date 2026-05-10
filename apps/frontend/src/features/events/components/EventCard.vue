<script setup lang="ts">
import { computed } from 'vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicEvent, OwnerEvent } from '@zod/event/event.dto'
import OwnerToolbar from '@/features/posts/components/OwnerToolbar.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import LocalizedTimeAgo from '@/features/shared/components/LocalizedTimeAgo.vue'
import IconCalendar from '@/assets/icons/interface/calendar.svg'
import { useI18n } from 'vue-i18n'
const props = defineProps<{
  event: PublicEvent | OwnerEvent
  showDetails: boolean
  dimHidden?: boolean
}>()

defineEmits<{
  (e: 'click', event: PublicEvent | OwnerEvent): void
  (e: 'edit', event: PublicEvent | OwnerEvent): void
  (e: 'hide', event: PublicEvent | OwnerEvent): void
  (e: 'delete', event: PublicEvent | OwnerEvent): void
}>()

const { locale } = useI18n()

const isVisible = computed(() => !('isVisible' in props.event) || props.event.isVisible !== false)
const eventLocation = computed(() => props.event.location ?? null)

const startsAtYear = computed(() => {
  const eventYear = props.event.startsAt.getFullYear()
  if (eventYear === new Date().getFullYear()) return ''
  return new Intl.DateTimeFormat(locale.value, { year: 'numeric' }).format(props.event.startsAt)
})

const startsAtTime = computed(() =>
  new Intl.DateTimeFormat(locale.value, { timeStyle: 'short' }).format(props.event.startsAt)
)

const startsAtMonthAndDay = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', day: 'numeric' }).format(
    props.event.startsAt
  )
)

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
    class="event-wrapper position-relative w-100 p-2"
    :class="{
      'event-wrapper--invisible': event.isOwn && props.dimHidden && !(event as any).isVisible,
    }"
  >
    <div
      class="event-card p-3 rounded border shadow-sm bg-subtle"
      :class="{ 'event-card--own': event.isOwn }"
      @click="$emit('click', event)"
    >
      <div class="d-flex align-items-top justify-content-start flex-row w-100">
        <p class="flex-grow-1 flex-shrink-1 min-w-0 me-1 lh-sm small">{{ displayContent }}</p>
        <div
          class="small lh-sm flex-grow-0 flex-shrink-0 text-center d-flex align-items-center flex-column"
        >
          <IconCalendar class="text-primary d-block svg-icon-lg mb-1" />
          <div class="m-0">{{ startsAtYear }}</div>
          <h6 class="display-6 m-0">{{ startsAtMonthAndDay }}</h6>
          <div>
            <strong>{{ startsAtTime }}</strong>
          </div>
          <LocationLabel
            v-if="eventLocation"
            :location="eventLocation"
          />
        </div>
      </div>

      <div
        class="event-meta d-flex align-items-center justify-content-between gap-2 small text-muted"
      >
        <div class="d-flex align-items-center gap-2">
          <OwnerToolbar
            v-if="event.isOwn"
            :is-visible="isVisible"
            @edit="$emit('edit', event)"
            @delete="$emit('delete', event)"
            @hide="$emit('hide', event)"
          />
          <template v-else>
            <ProfileThumbnail
              :profile="event.postedBy"
              size="sm"
            />
            <span>{{ event.postedBy.publicName }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-card {
  background-color: var(--bs-body-bg);
}

.event-wrapper--invisible {
  opacity: 0.75;
}
</style>
