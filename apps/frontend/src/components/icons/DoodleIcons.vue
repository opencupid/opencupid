<script setup lang="ts">
  import { doodleIcons, type DoodleIconName } from '@/icons/doodleIcons'

  const props = defineProps<{
    name: DoodleIconName
    class?: string
  }>()

  const Component = doodleIcons[props.name]
</script>

<template>
  <component :is="Component" v-if="Component" :class="props.class" />
</template>
