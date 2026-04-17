<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MapPoi } from '@/features/map/types/map.types'
import type { PostSummary } from '@zod/post/post.dto'
import PostIt from '@/features/shared/ui/PostIt.vue'
import IconExpand from '@/assets/icons/arrows/chevrons-up.svg'
import IconCollapse from '@/assets/icons/arrows/chevrons-down.svg'

const props = defineProps<{
  posts: MapPoi[]
}>()

const emit = defineEmits<{
  (e: 'post:select', post: PostSummary): void
}>()

function handleClick(poi: MapPoi) {
  emit('post:select', poi.source as PostSummary)
}

const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function onWheel(e: WheelEvent) {
  if (isExpanded.value) return
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
  const el = e.currentTarget as HTMLElement
  el.scrollLeft += e.deltaY
  e.preventDefault()
}

const isVisible = computed(() => props.posts.length > 0)
</script>

<template>
  <BOffcanvas
    :show="isVisible"
    no-backdrop
    no-trap
    :focus="false"
    placement="bottom"
    body-class="p-0 d-flex overflow-hidden"
    header-class="py-1"
    class="nearby-features-panel"
    :class="{ expanded: isExpanded }"
  >
    <template #header>
      <div class="d-flex align-items-center justify-content-center w-100">
        <BButton
          variant="link-secondary"
          class="p-0 m-0"
          @click="toggleExpanded"
        >
          <IconExpand
            class="svg-icon"
            v-if="!isExpanded"
          />
          <IconCollapse
            class="svg-icon"
            v-else
          />
        </BButton>
      </div>
    </template>
    <div
      class="nearby-items d-flex flex-grow-1 min-w-0"
      @wheel="onWheel"
    >
      <div
        v-for="poi in posts"
        :key="poi.id"
        class="user-select-none col-12 col-sm-6 col-md-4 col-lg-2"
        @click="handleClick(poi)"
      >
        <PostIt
          class="cursor-pointer p-2 post-content"
          :id="poi.id"
        >
          {{ (poi.title ?? '').substring(0, 120) }}
        </PostIt>
      </div>
    </div>
  </BOffcanvas>
</template>

<style scoped lang="scss">
/* In-template elements — reached via scoped data-v hash. */
.nearby-items {
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;

  & > * {
    flex-shrink: 0;
  }
}

.post-content {
  overflow: hidden;
  font-family: 'Patrick Hand', cursive;
  font-size: 0.95rem;
  line-height: 1rem;
}

/* Override PostIt's 150px min-height — our teaser cards size to content. */
.nearby-items :deep(.post-it-wrapper) {
  min-height: 0;
}
</style>

<style lang="scss">
/*
 * Rules targeting the BOffcanvas root (.nearby-features-panel) must be
 * unscoped — the element is teleported to <body> without our data-v hash.
 * Descendant selectors that cross the teleport boundary also belong here.
 */
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.nearby-features-panel.offcanvas {
  height: auto;
  max-height: 15vh;
  transition: max-height 200ms ease;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);

  @include media-breakpoint-up(lg) {
    max-height: 10vh;
  }

  @include media-breakpoint-up(xl) {
    max-height: 15vh;
  }

  &.expanded {
    max-height: 60vh;

    @include media-breakpoint-up(md) {
      max-height: 50vh;
    }

    @include media-breakpoint-up(lg) {
      max-height: 50vh;
    }

    @include media-breakpoint-up(xl) {
      max-height: 30vh;
    }
  }
}

.nearby-features-panel.expanded .nearby-items {
  flex-wrap: wrap;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
