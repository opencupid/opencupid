<script setup lang="ts">
import { computed } from 'vue'
import { formatTimeAgoIntl, useNow } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ time: Date }>()

const { locale, t } = useI18n()

const MINUTE_MS = 60_000

// Same refresh cadence useTimeAgoIntl uses.
const now = useNow({ interval: 30_000 })

// Hungarian's narrow style gives the compact "3 hónapja" / "2 hete" forms;
// English narrow is too terse ("3mo ago"), so it keeps the long style.
const formatOptions = {
  locale: locale.value,
  relativeTimeFormatOptions: { style: locale.value === 'hu' ? 'narrow' : 'long' } as const,
}

// Under a minute reads "just now" rather than a seconds count. This also
// covers times slightly in the future — a server timestamp a few hundred ms
// ahead of the browser clock — which Intl would render as "in 0 seconds".
const timeAgo = computed(() =>
  now.value.getTime() - props.time.getTime() < MINUTE_MS
    ? t('uicomponents.just_now')
    : formatTimeAgoIntl(props.time, formatOptions, now.value)
)
</script>

<template>
  <slot :timeAgo="timeAgo">{{ timeAgo }}</slot>
</template>
