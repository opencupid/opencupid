<script setup lang="ts">
import { computed } from 'vue'
import PostIt from '@/features/shared/ui/PostIt.vue'

const props = withDefaults(
  defineProps<{
    index?: number
    isAnimated?: boolean
  }>(),
  { index: 0, isAnimated: true }
)

const animation = computed(() => (props.isAnimated ? 'wave' : undefined))
</script>

<template>
  <PostIt :id="`placeholder-${index}`" class="postit h-100">
    <div class="py-4">
      <BPlaceholder
        cols="8"
        :animation="animation"
      />
      <BPlaceholder
        cols="6"
        :animation="animation"
      />
    </div>
  </PostIt>
</template>

<style scoped>
:deep(.post-it) {
  opacity: 0.5;
  min-height: 8rem;
}
</style>
