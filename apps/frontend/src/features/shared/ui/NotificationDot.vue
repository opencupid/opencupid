<script setup lang="ts">
import { faCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// whether to show the notification dot
const props = defineProps<{ show: boolean }>()
</script>

<template>
  <span class="icon-wrapper position-relative">
    <slot />
    <FontAwesomeIcon
      v-if="props.show"
      :icon="faCircle"
      class="text-danger position-absolute top-0 start-55 translate-middle"
      style="font-size: 0.75rem"
    />
  </span>
</template>

<style scoped>

</style>
