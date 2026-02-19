<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTagsStore } from '@/store/tagStore'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import type { PopularTag } from '@zod/tag/tag.dto'

const props = withDefaults(
  defineProps<{
    location?: { country?: string; cityName?: string }
    limit?: number
  }>(),
  { limit: 50 }
)

const tagStore = useTagsStore()
const findProfileStore = useFindProfileStore()
const router = useRouter()

onMounted(async () => {
  await tagStore.fetchPopularTags({
    country: props.location?.country,
    cityName: props.location?.cityName,
    limit: props.limit,
  })
})

const sortedTags = computed(() => {
  return [...tagStore.popularTags].sort((a, b) => a.name.localeCompare(b.name))
})

const minCount = computed(() => Math.min(...tagStore.popularTags.map((t) => t.count)))
const maxCount = computed(() => Math.max(...tagStore.popularTags.map((t) => t.count)))

function fontSize(count: number): string {
  const min = 0.75
  const max = 2
  if (maxCount.value === minCount.value) return `${(min + max) / 2}rem`
  const ratio = (count - minCount.value) / (maxCount.value - minCount.value)
  return `${min + ratio * (max - min)}rem`
}

async function handleTagClick(tag: PopularTag) {
  if (findProfileStore.socialFilter) {
    findProfileStore.socialFilter.tags = [{ id: tag.id, name: tag.name, slug: tag.slug }]
    await findProfileStore.persistSocialFilter()
  }
  router.push('/browse/social')
}
</script>

<template>
  <div
    v-if="sortedTags.length > 0"
    class="d-flex flex-wrap gap-2 align-items-center"
    data-testid="tag-cloud"
  >
    <a
      v-for="tag in sortedTags"
      :key="tag.id"
      href="#"
      class="tag-cloud-item text-decoration-none"
      :style="{ fontSize: fontSize(tag.count) }"
      @click.prevent="handleTagClick(tag)"
    >
      {{ tag.name }}
    </a>
  </div>
</template>

<style scoped>
.tag-cloud-item {
  color: var(--bs-primary);
  transition: opacity 0.15s;
}
.tag-cloud-item:hover {
  opacity: 0.7;
}
</style>
