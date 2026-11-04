<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OwnerEvent, PublicEventDetail } from '@zod/event/event.dto'
import UserContentMapPopup from '@/features/userContent/components/UserContentMapPopup.vue'

const props = defineProps<{
  item: PublicEventDetail | OwnerEvent
  /**
   * Card mode: show only the event's name (the first line of its content)
   * and, over a picture, in the same translucent overlay as profile cards.
   */
  titleOnly?: boolean
}>()

const { locale } = useI18n()

const text = computed(() => {
  const content = props.item.content ?? ''
  return props.titleOnly ? content.split('\n', 1)[0] : content.substring(0, 120)
})

const overlay = computed(() => props.titleOnly && props.item.images.length > 0)

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
        v-if="overlay"
        class="event-overlay p-2"
      >
        <div class="event-title fs-6 fw-bold">{{ text }}</div>
        <div class="small">{{ startsAtFormatted }}</div>
      </div>
      <div
        v-else
        class="bg-event-light p-2"
      >
        <div :class="{ 'fs-6 fw-bold': titleOnly }">{{ text }}</div>
        <div class="small text-secondary fw-semibold">
          {{ startsAtFormatted }}
        </div>
      </div>
    </template>
  </UserContentMapPopup>
</template>

<style scoped lang="scss">
// Same overlay and type treatment as ProfileMapCard.
.event-overlay {
  font-size: 0.9rem;
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
</style>
