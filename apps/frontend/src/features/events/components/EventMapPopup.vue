<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicEventDetail } from '@zod/event/event.dto'
import ImageTag from '@/features/images/components/ImageTag.vue'

const props = defineProps<{ item: PublicEventDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()

const { locale } = useI18n()

const startsAtFormatted = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    props.item.startsAt
  )
)

const firstImage = computed(() => props.item.images[0])
</script>

<template>
  <div
    class="event-map-popup bg-event-light cursor-pointer user-select-none"
    @click="$emit('click', item.id)"
  >
    <div
      v-if="firstImage"
      class="popup-image ratio ratio-4x3 mb-2 overflow-hidden"
    >
      <ImageTag
        :image="firstImage"
        variant="card"
      />
    </div>
    <div class="event-map-popup__content p-2">
      {{ (item.content ?? '').substring(0, 120) }}
    </div>
    <div class="small text-secondary fw-semibold p-2">
      {{ startsAtFormatted }}
    </div>
  </div>
</template>

<style scoped>
.event-map-popup {
  word-break: break-word;
}
</style>
