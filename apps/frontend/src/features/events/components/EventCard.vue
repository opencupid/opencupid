<script setup lang="ts">
import { computed } from 'vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicEvent, OwnerEvent } from '@zod/event/event.dto'
import ViewerToolbar from '@/features/userContent/components/ViewerToolbar.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import IconCalendar from '@/assets/icons/interface/calendar.svg'
import IconChecklist from '@/assets/icons/interface/checklist.svg'
import EventCalendarExportDropdown from './EventCalendarExportDropdown.vue'
import ImageCarousel from '@/features/publicprofile/components/ImageCarousel.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  event: PublicEvent | OwnerEvent
  showDetails: boolean
}>()

defineEmits<{
  (e: 'click', event: PublicEvent | OwnerEvent): void
  (e: 'attend', event: PublicEvent | OwnerEvent): void
}>()

const { t, locale } = useI18n()

const shareEventPayload = computed<SharePayload>(() => ({
  title: props.event.content.substring(0, 80),
  text: t('events.share.event_text', { publicName: props.event.postedBy.publicName }),
  url: `${window.location.origin}/events/${props.event.id}`,
}))

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
  <div class="event-wrapper position-relative w-100 p-2">
    <div
      class="event-card overflow-hidden rounded border shadow-sm bg-subtle"
      :class="{ 'event-card--own': event.isOwn }"
      @click="$emit('click', event)"
    >
      <ImageCarousel
        v-if="event.images.length > 0"
        :images="event.images"
        class="mb-2"
      />
      <BRow class="g-2 align-items-start m-2">
        <BCol
          cols="12"
          md="8"
        >
          <p class="lh-sm small mb-0 p-2">{{ displayContent }}</p>
        </BCol>
        <BCol
          cols="12"
          md="4"
          class="small lh-sm text-center d-flex align-items-center flex-column p-2"
        >
          <IconCalendar class="text-primary d-block svg-icon-lg mb-1" />
          <div class="m-0">{{ startsAtYear }}</div>
          <h4 class="m-0">{{ startsAtMonthAndDay }}</h4>
          <h6>
            {{ startsAtTime }}
          </h6>
          <LocationLabel
            v-if="eventLocation"
            :location="eventLocation"
          />
          <div
            v-if="event.venue"
            class="text-muted text-truncate mw-100 small opacity-75"
            :title="event.venue"
          >
            {{ event.venue }}
          </div>
        </BCol>
      </BRow>

      <div
        class="event-meta d-flex align-items-center justify-content-between gap-2 small text-muted p-2"
      >
        <div
          v-if="!event.isOwn"
          class="d-flex align-items-center gap-2"
        >
          <ProfileThumbnail
            :profile="event.postedBy"
            size="sm"
          />
          <span>{{ event.postedBy.publicName }}</span>
        </div>
        <ViewerToolbar
          v-if="showDetails && !event.isOwn"
          :actions="['copy', 'share']"
          :copy-text="event.content"
          :share-payload="shareEventPayload"
        >
          <EventCalendarExportDropdown :event="event" />
          <BButton
            @click.stop="$emit('attend', event)"
            variant="link-secondary"
            size="sm"
            :title="t('events.actions.attend')"
            :aria-label="t('events.actions.attend')"
          >
            <IconChecklist class="svg-icon" />
          </BButton>
        </ViewerToolbar>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-card {
  background-color: var(--bs-event-light);
}
</style>
