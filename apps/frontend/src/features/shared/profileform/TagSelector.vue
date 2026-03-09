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
  }>(),
  {
    initialOptions: () => [],
  }
)

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
      v-model="model"
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
      <template #noResult>{{ t('profiles.forms.tag_no_results') }}</template>
    </Multiselect>
  </div>
</template>

<style lang="scss">
.interests-multiselect {
  .multiselect__tag {
    background-color: var(--bs-warning);
    color: var(--bs-body-bg);

    i:after {
      color: var(--bs-text-secondary);
    }
  }
}
</style>
