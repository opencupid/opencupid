<script setup lang="ts">
import { useTimeAgoIntl } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ time: Date }>()

const { locale } = useI18n()
const timeAgo = useTimeAgoIntl(() => props.time, { locale: locale.value })
</script>

<template>
  <slot :timeAgo="timeAgo">{{ timeAgo }}</slot>
</template>
