<script setup lang="ts">
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'

defineEmits<{ (e: 'back'): void }>()
</script>

<template>
  <div class="d-flex w-100 align-items-center gap-3">
    <div class="flex-grow-1 d-flex align-items-center">
      <slot name="back">
        <BButton
          variant="link-secondary"
          class="p-0 me-2"
          :aria-label="$t('common.back')"
          @click="$emit('back')"
        >
          <ChevronLeftIcon class="svg-icon" />
        </BButton>
      </slot>
      <slot name="title" />
    </div>
    <slot />
  </div>
</template>
