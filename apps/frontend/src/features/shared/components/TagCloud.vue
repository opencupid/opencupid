<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useTagsStore } from '@/store/tagStore'
import type { PopularTag } from '@zod/tag/tag.dto'
import cloud from 'd3-cloud'

const props = withDefaults(
  defineProps<{
    location?: { country?: string }
    limit?: number
    showLoading?: boolean
  }>(),
  { limit: 50, showLoading: false }
)

const emit = defineEmits<{
  'tag:select': [tag: PopularTag]
  'tag:hover': [tag: PopularTag | null]
}>()

const tagStore = useTagsStore()

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

// Deterministic pseudo-random placeholder badges
const placeholderBadges = Array.from({ length: 20 }, (_, i) => {
  const seed = (i * 7 + 3) % 20
  const w = 40 + (seed % 5) * 20
  const h = 18 + (seed % 3) * 4
  const col = (i % 4) - 1.5
  const row = Math.floor(i / 4) - 2
  return {
    x: col * (w + 20) + (row % 2) * 15,
    y: row * (h + 14),
    width: w,
    height: h,
    rx: h / 2,
    opacity: 0.08 + (seed % 4) * 0.04,
    delay: `${(i * 0.12).toFixed(2)}s`,
  }
})

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

function handleTagClick(tag: PopularTag) {
  emit('tag:select', tag)
}

onMounted(async () => {
  await tagStore.fetchPopularTags({
    country: props.location?.country,
    limit: props.limit,
  })
  runLayout(tagStore.popularTags)
})
</script>

<template>
  <svg
    v-if="!hasTags && props.showLoading"
    data-testid="tag-cloud-placeholder"
    width="100%"
    :viewBox="`${-WIDTH / 2} ${-HEIGHT / 2} ${WIDTH} ${HEIGHT}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <rect
      v-for="(b, i) in placeholderBadges"
      :key="i"
      :x="b.x - b.width / 2"
      :y="b.y - b.height / 2"
      :width="b.width"
      :height="b.height"
      :rx="b.rx"
      fill="currentColor"
      :opacity="b.opacity"
      class="placeholder-badge"
      :style="{ animationDelay: b.delay }"
    />
  </svg>
  <svg
    v-else
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
      @mouseenter="emit('tag:hover', w.tag)"
      @mouseleave="emit('tag:hover', null)"
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
.placeholder-badge {
  animation: pulse 1.8s ease-in-out infinite alternate;
}
@keyframes pulse {
  from {
    opacity: 0.06;
  }
  to {
    opacity: 0.18;
  }
}
</style>
