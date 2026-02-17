<script setup lang="ts">
import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'

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
    <IconArrowSingleLeft class="svg-icon-lg" />
  </BButton>
</template>
