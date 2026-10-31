<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll, useIntersectionObserver } from '@vueuse/core'
import type { UserContentKind } from '@shared/maps'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { BrowseListItem } from '@zod/browse/browseList.dto'

import BrowseGridCard from './BrowseGridCard.vue'
import BrowseGridFilters from './BrowseGridFilters.vue'
import type { GeocodingResult } from '@/features/geocoding/composables/useGeocoder'
import { browseItemTarget } from '../utils/browseListItem'
import ShareSheet, { type SharePayload } from '@/features/app/components/ShareSheet.vue'
import IconCross from '@/assets/icons/interface/cross.svg'
import IconChevronDown from '@/assets/icons/arrows/chevrons-down.svg'
import IconChevronUp from '@/assets/icons/arrows/chevrons-up.svg'

/**
 * Grid overlay listing what is inside the map area, nearest first. Full
 * screen on mobile, a right-hand panel from md up (styled by the parent).
 */
const props = defineProps<{
  /** Name of the settlement at the map centre, when known. */
  areaName: string | null
  items: BrowseListItem[]
  total: number
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  selectedTags: PublicTag[]
  availableTags: PublicTag[]
  sharePayload: SharePayload
}>()

const kinds = defineModel<UserContentKind[]>('kinds', { required: true })

const emit = defineEmits<{
  close: []
  'place:select': [place: GeocodingResult]
  select: [item: BrowseListItem]
  locate: [item: BrowseListItem]
  /** The hovered card's item, or null when the pointer leaves it. */
  hover: [item: BrowseListItem | null]
  'tag:add': [tag: PublicTag]
  'tag:remove': [tag: PublicTag]
  'load-more': []
}>()

const { t } = useI18n()

const scrollEl = ref<HTMLElement | null>(null)
const fieldsEl = ref<HTMLElement | null>(null)

// Once the filter fields scroll out of view, the header folds them into a
// one-line summary; the chevron reopens them as a drop-down.
const isCollapsed = ref(false)
const fieldsOpen = ref(false)
let fieldsOpenedAt = 0

useIntersectionObserver(
  fieldsEl,
  ([entry]) => {
    isCollapsed.value = !entry?.isIntersecting
    if (!isCollapsed.value) fieldsOpen.value = false
  },
  { root: scrollEl }
)

function toggleFields() {
  fieldsOpen.value = !fieldsOpen.value
  fieldsOpenedAt = scrollEl.value?.scrollTop ?? 0
}

function onScroll() {
  if (fieldsOpen.value && Math.abs((scrollEl.value?.scrollTop ?? 0) - fieldsOpenedAt) > 40) {
    fieldsOpen.value = false
  }
}

useInfiniteScroll(scrollEl, () => emit('load-more'), {
  distance: 300,
  canLoadMore: () => props.hasMore && !props.isLoading && !props.isLoadingMore,
})

// A new area or filter starts a fresh list: go back to the top.
watch(
  () => props.isLoading,
  (loading) => {
    if (loading && scrollEl.value) scrollEl.value.scrollTop = 0
  }
)

const title = computed(() =>
  props.areaName
    ? t('profiles.browse.grid.title_named', { place: props.areaName })
    : t('profiles.browse.grid.title')
)
const tagSummary = computed(() => props.selectedTags.map((tag) => `#${tag.name}`).join(' '))
const isEmpty = computed(() => !props.isLoading && props.items.length === 0)
const shareOpen = ref(false)
</script>

<template>
  <section
    class="browse-grid-panel d-flex flex-column bg-body"
    :class="{ collapsed: isCollapsed }"
    :aria-label="title"
  >
    <header class="grid-summary d-flex align-items-center gap-2 px-2 py-2 border-bottom">
      <BButton
        variant="light"
        class="close-button rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0"
        :aria-label="t('profiles.browse.grid.close')"
        @click="emit('close')"
      >
        <IconCross class="svg-icon" />
      </BButton>
      <div class="flex-grow-1 text-truncate">
        <span class="fw-bold">{{ title }}</span>
        <span
          v-if="tagSummary"
          class="text-muted small ms-1"
          >· {{ tagSummary }}</span
        >
      </div>
      <BButton
        v-if="isCollapsed"
        size="sm"
        variant="outline-secondary"
        class="expand-button flex-shrink-0"
        :aria-label="t('profiles.browse.grid.show_filters')"
        :aria-expanded="fieldsOpen"
        @click="toggleFields"
      >
        <IconChevronUp
          v-if="fieldsOpen"
          class="svg-icon"
        />
        <IconChevronDown
          v-else
          class="svg-icon"
        />
      </BButton>
    </header>

    <div class="position-relative flex-grow-1 overflow-hidden d-flex flex-column">
      <div
        v-if="isCollapsed && fieldsOpen"
        class="fields-drop position-absolute top-0 start-0 end-0 bg-body border-bottom shadow p-2"
      >
        <BrowseGridFilters
          v-model:kinds="kinds"
          :area-name="areaName"
          :selected-tags="selectedTags"
          :available-tags="availableTags"
          @place:select="emit('place:select', $event)"
          @tag:add="emit('tag:add', $event)"
          @tag:remove="emit('tag:remove', $event)"
        />
      </div>

      <div
        ref="scrollEl"
        class="grid-body flex-grow-1 overflow-auto"
        @scroll.passive="onScroll"
      >
        <div
          ref="fieldsEl"
          class="p-2 border-bottom"
        >
          <BrowseGridFilters
            v-model:kinds="kinds"
            :area-name="areaName"
            :selected-tags="selectedTags"
            :available-tags="availableTags"
            @place:select="emit('place:select', $event)"
            @tag:add="emit('tag:add', $event)"
            @tag:remove="emit('tag:remove', $event)"
          />
        </div>

        <div
          v-if="isEmpty"
          class="grid-empty text-center py-5 px-4 d-flex flex-column align-items-center gap-1"
        >
          <h2 class="h5 mb-0">{{ t('profiles.browse.grid.empty_title') }}</h2>
          <p class="text-muted mb-2">{{ t('profiles.browse.grid.empty_hint') }}</p>
          <BButton
            variant="primary"
            @click="shareOpen = true"
          >
            {{ t('profiles.browse.grid.invite_friend') }}
          </BButton>
        </div>

        <template v-else>
          <div
            v-if="!isLoading"
            class="small text-muted px-2 pt-2"
          >
            {{ t('profiles.browse.grid.results_count', { count: total }) }}
          </div>
          <div
            class="grid-cards p-2"
            :aria-busy="isLoading || isLoadingMore"
          >
            <template v-if="!isLoading">
              <BrowseGridCard
                v-for="item in items"
                :key="`${item.kind}-${browseItemTarget(item).id}`"
                :item="item"
                @select="emit('select', item)"
                @locate="emit('locate', item)"
                @hover="emit('hover', $event ? item : null)"
              />
            </template>
            <div
              v-for="i in isLoading ? 6 : isLoadingMore ? 4 : 0"
              :key="`skeleton-${i}`"
              class="grid-skeleton placeholder-glow"
              aria-hidden="true"
            >
              <span class="placeholder w-100 rounded skeleton-frame"></span>
              <span class="placeholder col-4 mt-1"></span>
            </div>
          </div>
          <div
            v-if="!isLoading && !hasMore && items.length > 0"
            class="small text-muted text-center pb-3"
          >
            {{ t('profiles.browse.grid.end_of_list') }}
          </div>
        </template>
      </div>
    </div>

    <ShareSheet
      v-model:open="shareOpen"
      :payload="sharePayload"
    >
      {{ t('profiles.browse.no_results_cta_title') }}
    </ShareSheet>
  </section>
</template>

<style scoped lang="scss">
.close-button {
  width: 2.25rem;
  height: 2.25rem;
}
.fields-drop {
  z-index: 3;
}
.grid-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 0.625rem;
}
.skeleton-frame {
  display: block;
  aspect-ratio: 4 / 5;
  height: auto;
}
</style>
