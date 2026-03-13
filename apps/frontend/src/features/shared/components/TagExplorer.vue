<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicTag, PopularTag } from '@zod/tag/tag.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'
import IconCurvedArrow from '@/assets/images/app/curved-arrow.svg'
import { useTagsStore } from '@/store/tagStore'

const { t } = useI18n()

const model = defineModel<PublicTag[]>({
  default: () => [],
})

const props = defineProps<{
  location?: LocationDTO
}>()

const tagStore = useTagsStore()
const tagCloudHint = ref<PopularTag | null>(null)
const popularTags = computed(() => tagStore.popularTags ?? ([] as PublicTag[]))

const handleTagCloudHover = (tag: PopularTag | null) => {
  tagCloudHint.value = tag
}

const handleTagCloudSelect = (tag: PopularTag) => {
  const exists = model.value.some((existing) => existing.id === tag.id)
  if (!exists) {
    model.value.push({ id: tag.id, name: tag.name, slug: tag.slug })
  }
}
</script>

<template>
  <TagSelector
    v-model="model"
    :taggable="true"
    :close-on-select="true"
    open-direction="top"
    :required="true"
    :initialOptions="popularTags"
    :hint="tagCloudHint"
  />
  <h6 class="mt-3 mt-lg-3 mb-0 text-center text-muted">
    {{ t('onboarding.interests_popular_heading') }}
  </h6>
  <div
    class="position-relative"
    style="min-height: 12rem"
  >
    <IconCurvedArrow class="curved-arrow" />
    <TagCloud
      v-if="props.location?.country"
      :key="props.location.country"
      :location="props.location"
      class="mb-3"
      @tag:select="handleTagCloudSelect"
      @tag:hover="handleTagCloudHover"
    />
  </div>
</template>

<style lang="scss" scoped>
.curved-arrow {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 70%;
  height: 70%;
  color: rgb(227, 227, 35);
  // opacity: 0.4;
  pointer-events: none;
  filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.4));
}


</style>
