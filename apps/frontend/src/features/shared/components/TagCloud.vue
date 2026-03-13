<script setup lang="ts">
import { onMounted, ref, computed, watch, useTemplateRef } from 'vue'
import { useElementSize, useDebounceFn } from '@vueuse/core'
import { useTagsStore } from '@/store/tagStore'
import type { PopularTag } from '@zod/tag/tag.dto'
import cloud from 'd3-cloud'

const props = withDefaults(
  defineProps<{
    location?: { country?: string }
    limit?: number
  }>(),
  { limit: 50 }
)

const emit = defineEmits<{ 'tag:select': [tag: PopularTag] }>()

const tagStore = useTagsStore()

const FONT_MIN = 12
const FONT_MAX = 48
const COLORS = ['#5e4b2c', '#8b6914', '#6b8e23', '#a0522d', '#2e8b57', '#b8860b', '#556b2f']

const container = useTemplateRef<HTMLDivElement>('container')
const { width, height } = useElementSize(container)

interface PositionedWord {
  text: string
  size: number
  x: number
  y: number
  tag: PopularTag
}

const words = ref<PositionedWord[]>([])
const tagsLoaded = ref(false)

const hasTags = computed(() => words.value.length > 0)

function scaleFontSize(
  count: number,
  minCount: number,
  maxCount: number,
  fontMax: number
): number {
  if (maxCount === minCount) return (FONT_MIN + fontMax) / 2
  const ratio = (count - minCount) / (maxCount - minCount)
  return FONT_MIN + ratio * (fontMax - FONT_MIN)
}

function runLayout(tags: PopularTag[], w: number, h: number) {
  if (tags.length === 0 || w <= 0 || h <= 0) return

  const fontMax = Math.min(FONT_MAX, w * 0.08)
  const minCount = Math.min(...tags.map((t) => t.count))
  const maxCount = Math.max(...tags.map((t) => t.count))

  const tagMap = new Map<string, PopularTag>()
  const input = tags.map((tag) => {
    tagMap.set(tag.name, tag)
    return { text: tag.name, size: scaleFontSize(tag.count, minCount, maxCount, fontMax) }
  })

  cloud()
    .size([w, h])
    .words(input)
    .font('sans-serif')
    .fontSize((d: any) => d.size)
    .rotate(0)
    .padding(3)
    .random(() => 0.5)
    .on('end', (output: any[]) => {
      words.value = output.map((wo) => ({
        text: wo.text!,
        size: wo.size!,
        x: wo.x!,
        y: wo.y!,
        tag: tagMap.get(wo.text!)!,
      }))
    })
    .start()
}

const debouncedLayout = useDebounceFn(() => {
  if (tagsLoaded.value) {
    runLayout(tagStore.popularTags, width.value, height.value)
  }
}, 200)

watch([width, height], debouncedLayout)

function handleTagClick(tag: PopularTag) {
  emit('tag:select', tag)
}

onMounted(async () => {
  await tagStore.fetchPopularTags({
    country: props.location?.country,
    limit: props.limit,
  })
  tagsLoaded.value = true
  runLayout(tagStore.popularTags, width.value, height.value)
})
</script>

<template>
  <div
    ref="container"
    class="tag-cloud-container"
  >
    <svg
      v-if="hasTags"
      data-testid="tag-cloud"
      :width="width"
      :height="height"
      :viewBox="`${-width / 2} ${-height / 2} ${width} ${height}`"
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
  </div>
</template>

<style scoped>
.tag-cloud-container {
  width: 100%;
  min-height: 300px;
  height: 100%;
}
.tag-cloud-word {
  transition: opacity 0.15s;
}
.tag-cloud-word:hover {
  opacity: 0.7;
}
</style>
