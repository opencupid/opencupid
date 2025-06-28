<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  countryCode: string
  size?: string
}>()

const lang = computed(() => {
  return props.countryCode == 'en' ? 'gb' : props.countryCode
})
</script>
<template>
  <CircleFlags :showFlagName="false" :size="size" :country="lang" title="" />
</template>
