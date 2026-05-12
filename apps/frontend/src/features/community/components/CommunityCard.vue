<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { PublicCommunity, OwnerCommunity } from '@zod/community/community.dto'
import OwnerToolbar from '@/features/posts/components/OwnerToolbar.vue'
import ViewerToolbar from '@/features/userContent/components/ViewerToolbar.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import IconCommunity from '@/assets/icons/interface/community.svg'

const props = defineProps<{
  community: PublicCommunity | OwnerCommunity
  showDetails: boolean
}>()

defineEmits<{
  (e: 'click', community: PublicCommunity | OwnerCommunity): void
  (e: 'edit', community: PublicCommunity | OwnerCommunity): void
  (e: 'hide', community: PublicCommunity | OwnerCommunity): void
  (e: 'delete', community: PublicCommunity | OwnerCommunity): void
}>()

const { t } = useI18n()

const shareCommunityPayload = computed<SharePayload>(() => ({
  title: props.community.content.substring(0, 80),
  text: t('community.share.community_text', { publicName: props.community.postedBy.publicName }),
  url: `${window.location.origin}/communities/${props.community.id}`,
}))

const isVisible = computed(
  () => !('isVisible' in props.community) || props.community.isVisible !== false,
)
const communityLocation = computed(() => props.community.location ?? null)

const GRID_TRUNCATE_LENGTH = 100
const displayContent = computed(() => {
  const content = props.community.content
  if (props.showDetails || content.length <= GRID_TRUNCATE_LENGTH) return content
  const truncated = content.substring(0, GRID_TRUNCATE_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…'
})
</script>

<template>
  <div class="community-wrapper position-relative w-100 p-2">
    <div
      class="community-card p-3 rounded border shadow-sm bg-subtle"
      :class="{ 'community-card--own': community.isOwn }"
      @click="$emit('click', community)"
    >
      <BRow class="g-2 align-items-start mb-3">
        <BCol cols="12" md="8">
          <p class="lh-sm small mb-0">{{ displayContent }}</p>
        </BCol>
        <BCol
          cols="12"
          md="4"
          class="small lh-sm text-center d-flex align-items-center flex-column"
        >
          <IconCommunity class="text-primary d-block svg-icon-lg mb-1" />
          <h6 v-if="community.yearFounded != null" class="m-0">
            {{ t('community.labels.founded_since', { year: community.yearFounded }) }}
          </h6>
          <LocationLabel v-if="communityLocation" :location="communityLocation" />
        </BCol>
      </BRow>

      <div
        class="community-meta d-flex align-items-center justify-content-between gap-2 small text-muted"
      >
        <div class="d-flex align-items-center gap-2">
          <OwnerToolbar
            v-if="community.isOwn"
            :is-visible="isVisible"
            @edit="$emit('edit', community)"
            @delete="$emit('delete', community)"
            @hide="$emit('hide', community)"
          />
          <template v-else>
            <ProfileThumbnail :profile="community.postedBy" size="sm" />
            <span>{{ community.postedBy.publicName }}</span>
          </template>
        </div>
        <ViewerToolbar
          v-if="showDetails && !community.isOwn"
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
  background-color: var(--bs-body-bg);
}
</style>
