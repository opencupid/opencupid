<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTagsStore } from '@/store/tagStore'
import { useI18n } from 'vue-i18n'
import type { PublicTag } from '@zod/tag/tag.dto'
import Multiselect from '../ui/multiselect'
import { detectMobile } from '@/lib/mobile-detect'
import { useWindowSize } from '@vueuse/core'
// v-model binding
const model = defineModel<PublicTag[]>({
  default: () => [],
})

const props = withDefaults(
  defineProps<{
    taggable?: boolean
  }>(),
  {
    taggable: true,
  }
)

// Store
const tagStore = useTagsStore()

// State
const tags = ref<PublicTag[]>([])
const isLoading = ref(false)
const { t } = useI18n()

/**
 * Called when the user types in the search input
 */
async function asyncFind(query: string) {
  if (!query) {
    tags.value = []
    return
  }
  isLoading.value = true
  try {
    tags.value = await tagStore.search(query)
  } catch (error) {
    console.error('Failed to search tags:', error)
  } finally {
    isLoading.value = false
  }
}

async function addTag(name: string) {
  isLoading.value = true
  try {
    const newTag = await tagStore.create({ name })
    tags.value.push(newTag)
    model.value.push(newTag)
  } catch (error) {
    console.error('Failed to add tag:', error)
  } finally {
    isLoading.value = false
  }
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
      v-bind:taggable="props.taggable"
      :options="tags"
      :multiple="true"
      :loading="isLoading"
      :searchable="true"
      :close-on-select="false"
      :clear-on-select="true"
      :internal-search="false"
      :show-labels="false"
      :show-no-results="true"
      :show-no-options="false"
      :maxHeight="selectHeight"
      open-direction="top"
      @tag="addTag"
      label="name"
      track-by="id"
      :tag-placeholder="t('profiles.forms.tag_add_placeholder')"
      :placeholder="t('profiles.forms.tag_search_placeholder')"
      @search-change="asyncFind"
    />
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
