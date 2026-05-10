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
    class="event-map-popup cursor-pointer p-3 user-select-none"
    @click="$emit('click', item.id)"
  >
    <div class="event-map-popup__date small text-primary fw-semibold mb-1">
      {{ startsAtFormatted }}
    </div>
    <div class="event-map-popup__content">
      {{ (item.content ?? '').substring(0, 120) }}
    </div>
  </div>
</template>

<style scoped>
.event-map-popup {
  background: var(--bs-body-bg, #fff);
  font-size: 0.85rem;
  word-break: break-word;
  border-left: 3px solid var(--bs-primary, #0d6efd);
}
</style>
