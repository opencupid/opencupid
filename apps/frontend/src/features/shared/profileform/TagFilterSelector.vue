<script setup lang="ts">
import { ref } from 'vue'
import type { PublicTag, PopularTag } from '@zod/tag/tag.dto'
import TagSelector from './TagSelector.vue'
import TagCloud from '../components/TagCloud.vue'
import IconTag from '@/assets/icons/e-commerce/tag.svg'

const model = defineModel<PublicTag[]>({
  default: () => [],
})

defineProps<{
  initialOptions?: PublicTag[]
}>()

const showTagCloud = ref(false)

function handleTagCloudSelect(tag: PopularTag) {
  const exists = model.value.some((t) => t.id === tag.id)
  if (!exists) {
    model.value = [...model.value, { id: tag.id, name: tag.name, slug: tag.slug }]
  }
  showTagCloud.value = false
}
</script>

<template>
  <div class="d-flex align-items-center gap-2">

    <div class="flex-grow-1">
      <TagSelector
        v-model="model"
        :taggable="false"
        open-direction="bottom"
        :close-on-select="true"
        :initialOptions="initialOptions ?? []"
      />
    </div>
  </div>

</template>
