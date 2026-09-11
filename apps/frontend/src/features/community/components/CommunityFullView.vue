<script setup lang="ts">
import { computed, inject } from 'vue'
import type { PublicCommunityDetail, OwnerCommunity } from '@zod/community/community.dto'

import CommunityCard from './CommunityCard.vue'
import IconCross from '@/assets/icons/interface/cross.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import IconMail from '@/assets/icons/interface/mail.svg'

import { useRouter } from 'vue-router'
import { isMdUp } from '@/lib/responsive'

const router = useRouter()

const props = defineProps<{
  community: PublicCommunityDetail | OwnerCommunity
}>()

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

defineEmits<{
  (e: 'close'): void
}>()

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100 h-100 d-flex flex-column">
    <div
      class="d-flex justify-content-end align-items-center w-100 flex-shrink-0"
      v-if="isMdUp"
    >
      <BButton
        variant="link-secondary"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </BButton>
    </div>
    <!--
      The md+ detail panel body is `overflow-hidden`, so content owns its own
      scroll container (matching PublicProfile). Without this the description
      is clipped instead of scrolling.
    -->
    <div class="community-scroll flex-grow-1 overflow-auto hide-scrollbar">
      <CommunityCard
        :community="community"
        :show-details="true"
        class="pt-2 pt-md-3 pt-lg-5"
      >
        <template #details>
          <dl
            v-if="community.contactUrl || community.contactEmail"
            class="community-contact d-flex flex-column gap-2 px-2 pt-2 mb-0 small"
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
                <span class="visually-hidden">{{ $t('community.labels.contact_url') }}</span>
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
                <span class="visually-hidden">{{ $t('community.labels.contact_email') }}</span>
              </dt>
              <dd class="mb-0 text-truncate">
                <a :href="contactEmailHref">{{ community.contactEmail }}</a>
              </dd>
            </div>
          </dl>
        </template>
      </CommunityCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.community-scroll {
  // Without this a flex child keeps `min-height: auto` and refuses to shrink
  // below its content, so `overflow-auto` would never actually scroll.
  min-height: 0;
}
</style>
