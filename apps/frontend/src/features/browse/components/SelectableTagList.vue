<script setup lang="ts">
import type { PublicTag } from '@zod/tag/tag.dto'

const props = withDefaults(
  defineProps<{
    tags?: PublicTag[]
    selectable?: boolean
    removable?: boolean
  }>(),
  {
    tags: () => [],
    selectable: false,
    removable: false,
  }
)

defineEmits<{
  select: [tag: PublicTag]
  remove: [tag: PublicTag]
}>()
</script>

<template>
  <ul
    class="tags list-unstyled my-0 d-inline-flex flex-wrap align-items-center overflow-hidden"
    v-if="tags.length"
  >
    <li
      v-for="tag in tags"
      :key="tag.id"
      class="me-2"
    >
      <BBadge
        variant="secondary"
        :class="{ selectable }"
        size="sm"
        :title="tag.name"
        @click="selectable && $emit('select', tag)"
      >
        {{ tag.name }}
        <span
          v-if="removable"
          class="ms-1 remove-icon"
          role="button"
          :aria-label="`Remove ${tag.name}`"
          @click.stop="$emit('remove', tag)"
        >&times;</span>
      </BBadge>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
:deep(.badge) {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  user-select: none;
  font-weight: normal;

  &:hover {
    background-color: var(--bs-tag) !important;
  }
}

.remove-icon {
  cursor: pointer;
  opacity: 0.7;
  font-size: 1.1em;
  line-height: 1;

  &:hover {
    opacity: 1;
  }
}
</style>
