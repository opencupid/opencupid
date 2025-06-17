<script setup lang="ts">
  import { ref, watchEffect } from 'vue'
  import { loadIcon, type DoodleIconName } from '@/icons/doodleIcons'

  const props = defineProps<{
    name: DoodleIconName
    class?: string
  }>()

  const Component = ref<any>(null)

  watchEffect(async () => {
    const mod = await loadIcon(props.name)
    Component.value = mod.default ?? mod
  })
</script>

<template>
  <component :is="Component" v-if="Component" :class="props.class" />
</template>
