<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OwnerEvent, PublicEventDetail } from '@zod/event/event.dto'
import UserContentMapPopup from '@/features/userContent/components/UserContentMapPopup.vue'

const props = defineProps<{
  item: PublicEventDetail | OwnerEvent
  /** Show only the event's name (the first line of its content). */
  titleOnly?: boolean
}>()

const { locale } = useI18n()

const text = computed(() => {
  const content = props.item.content ?? ''
  return props.titleOnly ? content.split('\n', 1)[0] : content.substring(0, 120)
})

const startsAtFormatted = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    props.item.startsAt
  )
)
</script>

<template>
  <UserContentMapPopup :item="item">
    <template #content>
      <div class="bg-event-light p-2">
        <div>{{ text }}</div>
        <div class="small text-secondary fw-semibold">
          {{ startsAtFormatted }}
        </div>
      </div>
    </template>
  </UserContentMapPopup>
</template>
