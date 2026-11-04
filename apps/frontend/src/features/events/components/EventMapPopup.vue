<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OwnerEvent, PublicEventDetail } from '@zod/event/event.dto'
import UserContentMapPopup from '@/features/userContent/components/UserContentMapPopup.vue'
import IconCalendar from '@/assets/icons/interface/calendar.svg'

const props = defineProps<{
  item: PublicEventDetail | OwnerEvent
  /**
   * Card mode: show only the event's name (the first line of its content)
   * and its date at the bottom, as profile cards do: over the picture in a
   * translucent overlay, or under a calendar icon when there is none.
   */
  titleOnly?: boolean
}>()

const { locale } = useI18n()

const text = computed(() => {
  const content = props.item.content ?? ''
  return props.titleOnly ? content.split('\n', 1)[0] : content.substring(0, 120)
})

const hasImage = computed(() => props.item.images.length > 0)

const startsAtFormatted = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    props.item.startsAt
  )
)
</script>

<template>
  <UserContentMapPopup :item="item">
    <template #content>
      <div
        v-if="titleOnly"
        class="d-flex flex-column"
        :class="{ 'h-100 bg-event-light': !hasImage }"
      >
        <div
          v-if="!hasImage"
          class="event-icon flex-grow-1 d-flex align-items-center justify-content-center text-event"
        >
          <IconCalendar />
        </div>
        <div
          class="event-caption p-2"
          :class="{ 'event-overlay': hasImage }"
        >
          <div class="event-title fs-6 fw-bold">{{ text }}</div>
          <div
            class="small"
            :class="{ 'text-secondary': !hasImage }"
          >
            {{ startsAtFormatted }}
          </div>
        </div>
      </div>
      <div
        v-else
        class="bg-event-light p-2"
      >
        <div>{{ text }}</div>
        <div class="small text-secondary fw-semibold">
          {{ startsAtFormatted }}
        </div>
      </div>
    </template>
  </UserContentMapPopup>
</template>

<style scoped lang="scss">
// Same caption placement, overlay and type treatment as ProfileMapCard.
.event-caption {
  font-size: 0.9rem;
}
.event-overlay {
  color: var(--bs-light);
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  background-color: var(--overlay-card);
}
.event-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.event-icon svg {
  width: 3rem;
  height: 3rem;
  opacity: 0.6;
}
</style>
