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
      class="text-danger position-absolute start-55 translate-middle notification-dot"
      style="font-size: 0.75rem"
    />
  </span>
</template>

<style scoped>
:deep(.notification-dot) {
  top: 5px !important;
}

</style>
