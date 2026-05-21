<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicEventDetail } from '@zod/event/event.dto'
import UserContentMapPopup from '@/features/userContent/components/UserContentMapPopup.vue'

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
  <UserContentMapPopup :item="item">
    <template #content>
      <div class="bg-event-light p-2">
        <div>{{ (item.content ?? '').substring(0, 120) }}</div>
        <div class="small text-secondary fw-semibold">
          {{ startsAtFormatted }}
        </div>
      </div>
    </template>
  </UserContentMapPopup>
</template>
