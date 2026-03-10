<script setup lang="ts">
import { computed } from 'vue'
import CountryFlag from '@/features/shared/ui/CountryFlag.vue'

const props = defineProps<{
  countryCode: string
  size?: number
}>()

const lang = computed(() => {
  return props.countryCode == 'en' ? 'gb' : props.countryCode
})
</script>
<template>
  <CountryFlag
    :size="size?.toString() ?? '36'"
    :code="lang"
    title=""
  />
</template>
