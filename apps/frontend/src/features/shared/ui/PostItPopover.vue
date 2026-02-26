<template>
  <div class="post-it-popover">
    <div class="header mb-2">
      <slot name="header"></slot>
    </div>
    <div class="content fs-4">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  variant: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    required: true,
  },
})
</script>

<style scoped lang="scss">
.post-it-popover {
  background: var(--postit-bg);
  border-radius: var(--radius-md);
  padding: 0.7rem 0.8rem 0.9rem;
}

.header {
  font-family: var(--bs-body-font-family, sans-serif);
}

.content {
  white-space: pre-wrap;
  overflow: hidden;
}
</style>
