<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTagsStore } from '@/store/tagStore'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import type { PopularTag } from '@zod/tag/tag.dto'
import cloud from 'd3-cloud'

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

const WIDTH = 600
const HEIGHT = 400
const FONT_MIN = 12
const FONT_MAX = 48
const COLORS = ['#5e4b2c', '#8b6914', '#6b8e23', '#a0522d', '#2e8b57', '#b8860b', '#556b2f']

interface PositionedWord {
  text: string
  size: number
  x: number
  y: number
  tag: PopularTag
}

const words = ref<PositionedWord[]>([])

const hasTags = computed(() => words.value.length > 0)

function scaleFontSize(count: number, minCount: number, maxCount: number): number {
  if (maxCount === minCount) return (FONT_MIN + FONT_MAX) / 2
  const ratio = (count - minCount) / (maxCount - minCount)
  return FONT_MIN + ratio * (FONT_MAX - FONT_MIN)
}

function runLayout(tags: PopularTag[]) {
  if (tags.length === 0) return

  const minCount = Math.min(...tags.map((t) => t.count))
  const maxCount = Math.max(...tags.map((t) => t.count))

  const tagMap = new Map<string, PopularTag>()
  const input = tags.map((tag) => {
    tagMap.set(tag.name, tag)
    return { text: tag.name, size: scaleFontSize(tag.count, minCount, maxCount) }
  })

  cloud()
    .size([WIDTH, HEIGHT])
    .words(input)
    .font('sans-serif')
    .fontSize((d: any) => d.size)
    .rotate(0)
    .padding(3)
    .random(() => 0.5)
    .on('end', (output: any[]) => {
      words.value = output.map((w) => ({
        text: w.text!,
        size: w.size!,
        x: w.x!,
        y: w.y!,
        tag: tagMap.get(w.text!)!,
      }))
    })
    .start()
}

async function handleTagClick(tag: PopularTag) {
  if (findProfileStore.socialFilter) {
    findProfileStore.socialFilter.tags = [{ id: tag.id, name: tag.name, slug: tag.slug }]
    await findProfileStore.persistSocialFilter()
  }
  router.push({ path: '/browse/social', query: { tag: tag.slug } })
}

onMounted(async () => {
  await tagStore.fetchPopularTags({
    country: props.location?.country,
    cityName: props.location?.cityName,
    limit: props.limit,
  })
  runLayout(tagStore.popularTags)
})
</script>

<template>
  <svg
    v-if="hasTags"
    data-testid="tag-cloud"
    width="100%"
    :viewBox="`${-WIDTH / 2} ${-HEIGHT / 2} ${WIDTH} ${HEIGHT}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <text
      v-for="(w, i) in words"
      :key="w.tag.id"
      text-anchor="middle"
      dominant-baseline="central"
      :x="w.x"
      :y="w.y"
      :fill="COLORS[i % COLORS.length]"
      :style="{ fontSize: `${w.size}px`, fontFamily: 'sans-serif', cursor: 'pointer' }"
      class="tag-cloud-word"
      @click="handleTagClick(w.tag)"
    >
      {{ w.text }}
    </text>
  </svg>
</template>

<style scoped>
.tag-cloud-word {
  transition: opacity 0.15s;
}
.tag-cloud-word:hover {
  opacity: 0.7;
}
</style>
