<script setup lang="ts">
import { computed } from 'vue'
import type { PublicTag } from '@zod/tag/tag.dto'

const model = defineModel<PublicTag[]>({
  default: () => [],
})

const props = defineProps<{
  /**
   * Bounds-scoped tag suggestions from the server. Any tag here that
   * is not already in `model` is rendered as a clickable "add" chip.
   */
  initialOptions?: PublicTag[]
}>()

const suggestions = computed<PublicTag[]>(() => {
  const selectedIds = new Set(model.value.map((t) => t.id))
  return (props.initialOptions ?? []).filter((t) => !selectedIds.has(t.id))
})

function addTag(tag: PublicTag) {
  if (model.value.some((t) => t.id === tag.id)) return
  model.value = [...model.value, tag]
}

function removeTag(tag: PublicTag) {
  model.value = model.value.filter((t) => t.id !== tag.id)
}
</script>

<template>
  <div class="tag-filter-selector">
    <ul
      v-if="model.length"
      class="tag-filter-selector__list tag-filter-selector__list--selected"
      aria-label="Selected tags"
    >
      <li
        v-for="tag in model"
        :key="tag.id"
        class="tag-filter-selector__badge"
      >
        <span class="tag-filter-selector__name">{{ tag.name }}</span>
        <button
          type="button"
          class="tag-filter-selector__remove"
          :aria-label="`Remove ${tag.name}`"
          @click="removeTag(tag)"
        >
          &times;
        </button>
      </li>
    </ul>

    <ul
      v-if="suggestions.length"
      class="tag-filter-selector__list tag-filter-selector__list--suggestions"
      aria-label="Suggested tags"
    >
      <li
        v-for="tag in suggestions"
        :key="tag.id"
      >
        <button
          type="button"
          class="tag-filter-selector__badge tag-filter-selector__badge--suggestion"
          :aria-label="`Add ${tag.name}`"
          @click="addTag(tag)"
        >
          <span class="tag-filter-selector__name">{{ tag.name }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.tag-filter-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tag-filter-selector__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-filter-selector__badge--suggestion {
  border: 1px dashed var(--bs-border-color, rgba(0, 0, 0, 0.15));
  background-color: transparent;
  cursor: pointer;
  padding: 0.125rem 0.625rem;
  transition:
    background-color 0.1s ease,
    border-color 0.1s ease;

  &:hover,
  &:focus-visible {
    background-color: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.06));
    border-color: transparent;
    outline: none;
  }
}

.tag-filter-selector__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.25rem 0.125rem 0.625rem;
  background-color: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.06));
  color: var(--bs-body-color, #212529);
  border-radius: 999px;
  font-size: 0.875rem;
  line-height: 1.4;
}

.tag-filter-selector__name {
  white-space: nowrap;
}

.tag-filter-selector__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
  transition:
    opacity 0.1s ease,
    background-color 0.1s ease;

  &:hover,
  &:focus-visible {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.08);
    outline: none;
  }
}
</style>
