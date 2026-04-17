<script setup lang="ts">
import type { MapPoi } from '@/features/map/types/map.types'
import type { PostSummary } from '@zod/post/post.dto'
import PostIt from '@/features/shared/ui/PostIt.vue'
import BottomSheet from '@/features/app/components/BottomSheet.vue'

import IconExpand from '@/assets/icons/arrows/chevrons-up.svg'
import IconCollapse from '@/assets/icons/arrows/chevrons-down.svg'
import { ref } from 'vue'

import { isMdUp } from '@/lib/responsive'

defineProps<{
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
</script>

<template>
  <BOffcanvas
    :show="posts.length > 0"
    shadow
    no-backdrop
    no-trap
    placement="bottom"
    body-class="p-0 d-flex overflow-auto hide-scrollbar d-flex"
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
    <div class="nearby-items d-flex">
      <div
        v-for="poi in posts"
        :key="poi.id"
        class="user-select-none col-6 col-md-4 col-lg-2"
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
.nearby-posts {
  scroll-snap-type: x mandatory;
}

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
  font-size: 1rem;
}
</style>

<style lang="scss">
.nearby-features-panel.expanded .nearby-items {
  flex-wrap: wrap;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>

<style lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.nearby-features-panel.offcanvas {
  height: 20vh;
  transition: height 200ms ease;

  @include media-breakpoint-up(sm) {
    height: 30vh;
  }

  @include media-breakpoint-up(md) {
    height: 20vh;
  }

  @include media-breakpoint-up(lg) {
    height: 10vh;
  }

  @include media-breakpoint-up(xl) {
    height: 15vh;
  }

  &.expanded {
    height: 75vh;
    @include media-breakpoint-up(sm) {
      height: 30vh;
    }

    @include media-breakpoint-up(md) {
      height: 20vh;
    }

    @include media-breakpoint-up(lg) {
      height: 10vh;
    }

    @include media-breakpoint-up(xl) {
      height: 50vh;
    }
  }
}
</style>
