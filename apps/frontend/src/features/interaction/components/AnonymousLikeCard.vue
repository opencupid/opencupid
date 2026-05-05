<script setup lang="ts">
import { inject, type Ref } from 'vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import IconSearch from '@/assets/icons/interface/search.svg'
import AnonymousProfileChip from './AnonymousProfileChip.vue'

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
</script>

<template>
  <BPopover
    placement="bottom"
    click
    title-class="d-none"
    body-class="popover-hint"
    style="min-width: 16rem"
  >
    <template #target>
      <AnonymousProfileChip class="clickable" />
    </template>
    <p class="mb-2">
      {{ $t('matches.anonymous_like_hint') }}
    </p>
    <div class="d-flex flex-column align-items-center justify-content-center gap-1 mb-2">
      <ProfileThumbnail
        v-if="viewerProfile"
        :profile="viewerProfile"
        class="owner-thumb dating-eligible-highlight mb-2"
      />
      <RouterLink
        to="/browse"
        class="btn btn-sm btn-primary"
      >
        <IconSearch class="svg-icon me-1" />
        {{ $t('matches.anonymous_like_hint_cta') }}
      </RouterLink>
    </div>
  </BPopover>
</template>

<style scoped>
.clickable {
  cursor: pointer;
}

:deep(.popover-hint) {
  min-width: 12rem;
}

.owner-thumb {
  width: 2.5rem;
  height: 2.5rem;
}


</style>
