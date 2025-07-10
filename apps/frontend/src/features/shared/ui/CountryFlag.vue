<script setup lang="ts">
import FlagIcon, { type CountryCode } from 'vue3-flag-icons'
import 'flag-icons/css/flag-icons.min.css'

defineProps<{
  code: string | undefined
  title: string | undefined
  size: string
}>()
</script>
<template>
  <FlagIcon
    :code="code as CountryCode"
    circle
    v-if="code"
    :title="title ?? ''"
    v-bind:size="size"
  />
</template>
