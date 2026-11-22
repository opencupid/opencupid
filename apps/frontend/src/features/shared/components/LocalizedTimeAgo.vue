<script setup lang="ts">
import { useTimeAgoIntl } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ time: Date }>()

const { locale } = useI18n()
// Hungarian's narrow style gives the compact "3 hónapja" / "2 hete" forms;
// English narrow is too terse ("3mo ago"), so it keeps the long style.
const timeAgo = useTimeAgoIntl(() => props.time, {
  locale: locale.value,
  relativeTimeFormatOptions: { style: locale.value === 'hu' ? 'narrow' : 'long' },
})
</script>

<template>
  <slot :timeAgo="timeAgo">{{ timeAgo }}</slot>
</template>
