<script setup lang="ts">
interface Props {
  url: string
  isHighlighted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isHighlighted: false,
})
</script>

<template>
  <img
    :src="url"
    :class="{ 'poi-avatar': true, highlighted: isHighlighted }"
  />
</template>

<style lang="scss" scoped>
.poi-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.poi-avatar.highlighted {
  box-shadow: 0 0 6px 3px rgba(217, 83, 79, 0.7);
  filter: drop-shadow(0 0 6px rgba(217, 83, 79, 0.6));
}
</style>
