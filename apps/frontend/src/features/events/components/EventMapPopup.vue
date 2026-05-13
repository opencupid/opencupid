<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicEventDetail } from '@zod/event/event.dto'

const props = defineProps<{ item: PublicEventDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const { locale } = useI18n()

const startsAtFormatted = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    props.item.startsAt
  )
)
</script>

<template>
  <div
    class="event-map-popup bg-event-light cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    <div class="event-map-popup__content mb-1">
      {{ (item.content ?? '').substring(0, 120) }}
    </div>
    <div class="small text-secondary fw-semibold ">
      {{ startsAtFormatted }}
    </div>
  </div>
</template>

<style scoped>
.event-map-popup {
  word-break: break-word;
}
</style>
