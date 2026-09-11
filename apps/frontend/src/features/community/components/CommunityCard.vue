<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PublicCommunity, OwnerCommunity } from '@zod/community/community.dto'
import ViewerToolbar from '@/features/userContent/components/ViewerToolbar.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import IconCommunity from '@/assets/icons/interface/community.svg'
import ImageCarousel from '@/features/publicprofile/components/ImageCarousel.vue'
import { tagsDataAttr } from '@/features/shared/contentTags'

const props = defineProps<{
  community: PublicCommunity | OwnerCommunity
  showDetails: boolean
}>()

defineEmits<{
  (e: 'click', community: PublicCommunity | OwnerCommunity): void
}>()

const { t } = useI18n()

const shareCommunityPayload = computed<SharePayload>(() => ({
  title: props.community.content.substring(0, 80),
  text: t('community.share.community_text', { publicName: props.community.postedBy.publicName }),
  url: `${window.location.origin}/communities/${props.community.id}`,
}))

const communityLocation = computed(() => props.community.location ?? null)

// The name (content) is the card title; the description is shown as the body
// only in the detail view, truncated to keep grid cards compact.
const GRID_TRUNCATE_LENGTH = 100
const displayDescription = computed(() => {
  const description = props.community.description ?? ''
  if (props.showDetails || description.length <= GRID_TRUNCATE_LENGTH) return description
  const truncated = description.substring(0, GRID_TRUNCATE_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…'
})

const tagSlugs = computed(() => tagsDataAttr(props.community.tags))
</script>

<template>
  <div
    class="community-wrapper position-relative w-100 p-2"
    :data-tags="tagSlugs"
  >
    <div
      class="community-card overflow-hidden rounded border shadow-sm bg-subtle"
      :class="{ 'community-card--own': community.isOwn }"
      @click="$emit('click', community)"
    >
      <span class="brand-container"></span>
      <span class="position-absolute p-2 p-md-3 bg-community-light shadow-sm floating-icon">
        <IconCommunity class="text-primary d-block svg-icon-lg" />
      </span>
      <ImageCarousel
        v-if="community.images.length > 0"
        :images="community.images"
        class="mb-2"
      />
      <div class="p-2">
        <h5 class="community-name lh-sm mb-1">
          {{ community.content }}
          <!-- Parens stay inside the guard so a community without a location
             does not render an empty "()". -->
          <span v-if="communityLocation"> (<LocationLabel :location="communityLocation" />) </span>
        </h5>
        <p
          v-if="displayDescription"
          class="lh-sm small mb-0 pre-line"
        >
          {{ displayDescription }}
        </p>
      </div>

      <!-- Detail-view extras (e.g. contact links) sit above the meta/toolbar row. -->
      <slot name="details" />

      <div
        class="community-meta d-flex align-items-center justify-content-between gap-2 small text-muted p-2"
      >
        <ViewerToolbar
          v-if="showDetails"
          :actions="['copy', 'share']"
          :copy-text="community.content"
          :share-payload="shareCommunityPayload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-card {
  background-color: var(--bs-community-light);
}
.floating-icon {
  top: 0.5rem;
  right: 1.5rem;
  z-index: 10;
  border-radius: 50%;
}
</style>
