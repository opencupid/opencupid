<script setup lang="ts">
defineProps<{
  show: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <BButton
    @click="$emit('click')"
    v-if="show"
    href="#"
    variant="link-secondary"
    class="d-flex align-items-center mt-2"
    size="lg"
  >
    <FontAwesomeIcon icon="fa-solid fa-chevron-left" class="" />
  </BButton>
</template>
