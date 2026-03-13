<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue'
import { useTagsStore } from '@/store/tagStore'
import { useI18n } from 'vue-i18n'
import type { PublicTag } from '@zod/tag/tag.dto'
import Multiselect from '../ui/multiselect'
import { detectMobile } from '@/lib/mobile-detect'
import { useWindowSize } from '@vueuse/core'
defineOptions({ inheritAttrs: false })

// v-model binding
const model = defineModel<PublicTag[]>({
  default: () => [],
})

const props = withDefaults(
  defineProps<{
    initialOptions?: PublicTag[]
    hint?: PublicTag | null
  }>(),
  {
    initialOptions: () => [],
    hint: undefined,
  }
)

const isHintAlreadySelected = computed(
  () => !!props.hint && model.value.some((t) => t.id === props.hint!.id)
)

const hintTagId = computed(() => (isHintAlreadySelected.value ? undefined : props.hint?.id))

const displayTags = computed(() => {
  if (!props.hint || isHintAlreadySelected.value) return model.value
  return [...model.value, props.hint]
})

const attrs = useAttrs()

// Store
const tagStore = useTagsStore()

// State
const tags = ref<PublicTag[]>(props.initialOptions)
const isLoading = ref(false)
const { t } = useI18n()
const activeQuery = ref('')

// Keep initial options in sync when the parent loads them asynchronously
watch(
  () => props.initialOptions,
  (newOptions) => {
    if (!activeQuery.value) {
      tags.value = newOptions
    }
  }
)

/**
 * Called when the user types in the search input
 */
async function asyncFind(query: string) {
  activeQuery.value = query
  if (!query) {
    tags.value = props.initialOptions
    return
  }
  isLoading.value = true
  const response = await tagStore.search(query)
  if (response.success) {
    tags.value = response.data?.result ?? []
  } else {
    console.error('Failed to search tags:', response.message)
  }
  isLoading.value = false
}

async function addTag(name: string) {
  isLoading.value = true
  const response = await tagStore.create({ name })
  if (response.success) {
    const newTag = response.data?.result
    if (newTag) {
      tags.value.push(newTag)
      model.value.push(newTag)
    }
  } else {
    console.error('Failed to add tag:', response.message)
  }
  isLoading.value = false
}
const { width, height } = useWindowSize()

const selectHeight = computed(() => {
  return height.value * 0.25
})
</script>

<template>
  <div class="interests-multiselect">
    <Multiselect
      :model-value="displayTags"
      @update:model-value="model = $event.filter((t: PublicTag) => t.id !== hintTagId)"
      v-bind="attrs"
      :options="tags"
      :multiple="true"
      :loading="isLoading"
      :searchable="true"
      :clear-on-select="true"
      :internal-search="false"
      :show-labels="false"
      :show-no-results="true"
      :show-no-options="false"
      :maxHeight="selectHeight"
      @tag="addTag"
      label="name"
      track-by="id"
      :tag-placeholder="t('profiles.forms.tag_add_placeholder')"
      :placeholder="t('profiles.forms.tag_search_placeholder')"
      @search-change="asyncFind"
    >
      <template #tag="{ option, remove }">
        <span
          class="multiselect__tag"
          :class="{ 'multiselect__tag--hint': option.id === hintTagId }"
          @mousedown.prevent
        >
          <span>{{ option.name }}</span>
          <i
            v-if="option.id !== hintTagId"
            tabindex="1"
            @keypress.enter.prevent="remove(option)"
            @mousedown.prevent="remove(option)"
            class="multiselect__tag-icon"
          ></i>
        </span>
      </template>
      <template #noResult>{{ t('profiles.forms.tag_no_results') }}</template>
    </Multiselect>
  </div>
</template>

<style lang="scss">
.interests-multiselect {
  .multiselect__tag {
    background-color: var(--bs-warning);
    color: var(--bs-body-bg);

    &--hint {
      background-color: #efefef;
      color: var(--bs-secondary);
      opacity: 0.7;
    }

    i:after {
      color: var(--bs-text-secondary);
    }
  }
}
</style>
