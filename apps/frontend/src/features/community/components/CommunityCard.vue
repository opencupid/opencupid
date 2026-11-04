<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { PublicCommunity, OwnerCommunity } from '@zod/community/community.dto'
import ViewerToolbar from '@/features/userContent/components/ViewerToolbar.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'
import IconCommunity from '@/assets/icons/interface/community.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import IconMail from '@/assets/icons/interface/mail.svg'
import ImageCarousel from '@/features/publicprofile/components/ImageCarousel.vue'
import { tagsDataAttr } from '@/features/shared/contentTags'

const props = defineProps<{
  community: PublicCommunity | OwnerCommunity
  /** Show the copy/share toolbar. */
  showDetails: boolean
  /** Clip the description to a short excerpt, as in grid tiles. */
  truncateText?: boolean
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

// Hostname reads better than the raw URL; the schema guarantees it parses.
const contactUrlLabel = computed(() =>
  props.community.contactUrl ? new URL(props.community.contactUrl).host : null
)

// z.email() allows RFC local-part characters (#, ?, &, ...) that are
// fragment/query delimiters inside a mailto: URI, so the address must be
// percent-encoded before interpolation. Encode each side of the `@`
// separately so it stays a literal separator rather than being escaped too.
const contactEmailHref = computed(() => {
  const email = props.community.contactEmail
  if (!email) return undefined
  const at = email.lastIndexOf('@')
  return `mailto:${encodeURIComponent(email.slice(0, at))}@${encodeURIComponent(email.slice(at + 1))}`
})

const communityLocation = computed(() => props.community.location ?? null)

// The name (content) is the card title; the description is the body,
// truncated on request to keep grid cards compact.
const GRID_TRUNCATE_LENGTH = 100
const displayDescription = computed(() => {
  const description = props.community.description ?? ''
  if (!props.truncateText || description.length <= GRID_TRUNCATE_LENGTH) return description
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

      <!-- Contact links sit above the meta/toolbar row; clicks on them
           follow the link without opening the card. -->
      <dl
        v-if="community.contactUrl || community.contactEmail"
        class="community-contact d-flex flex-column gap-2 px-2 pt-2 mb-0 small"
        @click.stop
      >
        <div
          v-if="community.contactUrl"
          class="d-flex align-items-center gap-2"
        >
          <dt class="text-muted mb-0">
            <IconGlobe
              class="svg-icon"
              aria-hidden="true"
            />
            <span class="visually-hidden">{{ t('community.labels.contact_url') }}</span>
          </dt>
          <dd class="mb-0 text-truncate">
            <a
              :href="community.contactUrl"
              target="_blank"
              rel="noopener noreferrer external"
            >
              {{ contactUrlLabel }}
            </a>
          </dd>
        </div>
        <div
          v-if="community.contactEmail"
          class="d-flex align-items-center gap-2"
        >
          <dt class="text-muted mb-0">
            <IconMail
              class="svg-icon"
              aria-hidden="true"
            />
            <span class="visually-hidden">{{ t('community.labels.contact_email') }}</span>
          </dt>
          <dd class="mb-0 text-truncate">
            <a :href="contactEmailHref">{{ community.contactEmail }}</a>
          </dd>
        </div>
      </dl>

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
