<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { OwnerEvent, PublicEvent } from '@zod/event/event.dto'
import IconDownload from '@/assets/icons/interface/download.svg'

const GCAL_DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

const props = defineProps<{
  event: PublicEvent | OwnerEvent
}>()

const { t } = useI18n()

const icsHref = computed(
  () => `${__APP_CONFIG__.API_BASE_URL}/content/events/${props.event.id}/ics`
)

const toGcalStamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

const googleCalendarHref = computed(() => {
  const start = props.event.startsAt
  const end = new Date(start.getTime() + GCAL_DEFAULT_DURATION_MS)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: props.event.content.slice(0, 200),
    dates: `${toGcalStamp(start)}/${toGcalStamp(end)}`,
    details: props.event.content,
  })
  const location = props.event.venue ?? props.event.location?.cityName ?? ''
  if (location) params.set('location', location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
})
</script>

<template>
  <BDropdown
    variant="link"
    size="sm"
    no-caret
    auto-close="outside"
    toggle-class="p-1 border-0 link-secondary"
    :title="t('events.actions.add_to_calendar')"
    :aria-label="t('events.actions.add_to_calendar')"
    @click.stop
  >
    <template #button-content>
      <IconDownload class="svg-icon" />
    </template>
    <li>
      <a
        class="dropdown-item"
        :href="icsHref"
        :download="`event-${event.id}.ics`"
        @click.stop
      >
        {{ t('events.actions.download_ics') }}
      </a>
    </li>
    <li>
      <a
        class="dropdown-item"
        :href="googleCalendarHref"
        target="_blank"
        rel="noopener"
        @click.stop
      >
        {{ t('events.actions.add_to_google_calendar') }}
      </a>
    </li>
  </BDropdown>
</template>
