<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MAX_BROWSE_TAGS, USER_CONTENT_KINDS, type UserContentKind } from '@shared/maps'
import type { PublicTag } from '@zod/tag/tag.dto'

import SelectableTagList from './SelectableTagList.vue'
import IconTag from '@/assets/icons/e-commerce/tag.svg'

/**
 * The grid's filter fields: the shared tag selection and the content types.
 * Both are the same state the map uses (search pill tags, map layers).
 */
const props = defineProps<{
  selectedTags: PublicTag[]
  availableTags: PublicTag[]
}>()

const kinds = defineModel<UserContentKind[]>('kinds', { required: true })

const emit = defineEmits<{
  'tag:add': [tag: PublicTag]
  'tag:remove': [tag: PublicTag]
}>()

const { t } = useI18n()

const KIND_LABELS: Record<UserContentKind, string> = {
  profile: 'map.layer_control.people',
  post: 'map.layer_control.posts',
  event: 'map.layer_control.events',
  community: 'map.layer_control.communities',
}

const showTagPicker = ref(false)

const addableTags = computed(() =>
  props.availableTags.filter((tag) => !props.selectedTags.some((s) => s.id === tag.id))
)
const canAddTag = computed(
  () => props.selectedTags.length < MAX_BROWSE_TAGS && addableTags.value.length > 0
)

function addTag(tag: PublicTag) {
  showTagPicker.value = false
  emit('tag:add', tag)
}

function toggleKind(kind: UserContentKind) {
  kinds.value = kinds.value.includes(kind)
    ? kinds.value.filter((k) => k !== kind)
    : [...kinds.value, kind]
}

// The backend rejects an empty `kinds` list, so the last type stays on
// (same rule as MapLayerControl).
function isLocked(kind: UserContentKind) {
  return kinds.value.length === 1 && kinds.value[0] === kind
}
</script>

<template>
  <div class="browse-grid-filters d-flex flex-column gap-2">
    <div
      class="d-flex align-items-start gap-2"
      role="group"
      :aria-label="t('profiles.browse.grid.tags_label')"
    >
      <IconTag
        width="20"
        height="20"
        class="text-secondary flex-shrink-0 mt-1"
      />
      <div class="d-flex flex-wrap align-items-center gap-1 flex-grow-1 min-w-0">
        <SelectableTagList
          :tags="selectedTags"
          removable
          @remove="emit('tag:remove', $event)"
        />
        <BButton
          v-if="canAddTag"
          size="sm"
          variant="outline-secondary"
          class="add-tag rounded-pill py-0"
          :aria-expanded="showTagPicker"
          @click="showTagPicker = !showTagPicker"
        >
          {{ t('profiles.browse.grid.add_tag') }}
        </BButton>
      </div>
    </div>
    <div
      v-if="showTagPicker && canAddTag"
      class="tag-picker border rounded p-2"
    >
      <SelectableTagList
        :tags="addableTags"
        selectable
        @select="addTag"
      />
    </div>
    <div
      class="d-flex flex-wrap gap-1"
      role="group"
      :aria-label="t('profiles.browse.grid.types_label')"
    >
      <BButton
        v-for="kind in USER_CONTENT_KINDS"
        :key="kind"
        size="sm"
        :variant="kinds.includes(kind) ? 'secondary' : 'outline-secondary'"
        :aria-pressed="kinds.includes(kind)"
        :disabled="isLocked(kind)"
        :data-kind="kind"
        @click="toggleKind(kind)"
      >
        {{ t(KIND_LABELS[kind]) }}
      </BButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.min-w-0 {
  min-width: 0;
}
</style>
