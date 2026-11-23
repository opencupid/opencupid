<script setup lang="ts">
// Recap-page teaser for a viewer who turned on dating: a few of their
// potential matches drawn as they appear on the map, plus the smile button
// and its popover, so they learn what a match looks like and how to
// approach one. Silhouette markers fill in for missing matches.
import { computed, onMounted, provide, ref } from 'vue'
import { api, safeApiCall } from '@/lib/api'
import { BROWSE_LIST_MAX_LIMIT, BrowseListResponseSchema } from '@zod/browse/browseList.dto'
import type { PublicProfile } from '@zod/profile/profile.dto'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import ProfileMarker from '@/features/publicprofile/components/ProfileMarker.vue'
import AnonymousToggle from '@/features/interaction/components/AnonymousToggle.vue'
import IconLike from '@/assets/icons/emojis/smiling-emoji.svg'

const PREVIEW_COUNT = 3
const WORLD = { south: -90, north: 90, west: -180, east: 180 }

const ownerProfileStore = useOwnerProfileStore()
// AnonymousToggle shows the viewer's own avatar as the "reveal" choice.
provide(
  'viewerProfile',
  computed(() => ownerProfileStore.profile)
)

type PreviewProfile = Pick<PublicProfile, 'id' | 'profileImages'>

// Photo-less stand-ins: the marker draws them as the highlighted silhouette.
const placeholders: PreviewProfile[] = Array.from({ length: PREVIEW_COUNT }, (_, i) => ({
  id: `placeholder-${i}`,
  profileImages: [],
}))

const matches = ref<PreviewProfile[]>([])
const profiles = computed(() => [...matches.value, ...placeholders].slice(0, PREVIEW_COUNT))
const selectedAnonymous = ref<boolean | null>(null)

onMounted(async () => {
  try {
    const res = await safeApiCall(() =>
      api.get('/find/list', {
        params: { ...WORLD, kinds: 'profile', limit: BROWSE_LIST_MAX_LIMIT },
      })
    )
    const { items } = BrowseListResponseSchema.parse(res.data)
    matches.value = items
      .flatMap((i) => (i.kind === 'profile' && i.highlighted ? [i.profile] : []))
      .map((p) => ({ p, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, PREVIEW_COUNT)
      .map(({ p }) => p)
  } catch (err) {
    // The placeholders still illustrate the point; log and carry on.
    console.warn('Failed to load match preview', err)
  }
})
</script>

<template>
  <section class="match-preview d-flex flex-column align-items-center gap-3">
    <div class="d-flex justify-content-center gap-3 markers">
      <ProfileMarker
        v-for="profile in profiles"
        :key="profile.id"
        :profile="profile"
        highlighted
      />
    </div>
    <p class="text-center mb-0">
      {{ $t('onboarding.confirmation.match_preview_hint') }}
    </p>
    <div class="popover bs-popover-top position-relative mw-100">
      <div class="popover-arrow"></div>
      <div class="popover-header d-flex">
        <span class="flex-grow-1">{{ $t('interactions.send_a_like') }}</span>
        <IconLike class="svg-icon text-dating" />
      </div>
      <div class="popover-body">
        <AnonymousToggle
          :selectedAnonymous="selectedAnonymous"
          @change="selectedAnonymous = $event"
        />
      </div>
    </div>
    <BButton
      class="btn-icon-lg smile-button"
      variant="dating"
      tabindex="-1"
    >
      <IconLike class="svg-icon-lg" />
    </BButton>
  </section>
</template>

<style scoped>
/* Stagger the markers a little so they read as scattered on a map. */
.markers {
  padding-block: 0.5rem;
}
.markers > :nth-child(1) {
  transform: translateY(0.4rem);
}
.markers > :nth-child(2) {
  transform: translateY(-0.5rem);
}
.markers > :nth-child(3) {
  transform: translateY(0.15rem);
}

/* A static copy of the smile popover, laid out in the page flow. */
.popover {
  min-width: 16rem;
  box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.4);
}
.popover-arrow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.smile-button {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}
</style>
