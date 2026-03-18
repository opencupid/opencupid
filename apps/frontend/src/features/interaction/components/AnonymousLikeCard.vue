<script setup lang="ts">
import { inject, type Ref } from 'vue'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')
</script>

<template>
  <BPopover
    placement="top"
    click
    title-class="d-none"
    body-class="popover-hint"
  >
    <template #target>
      <div class="ratio ratio-1x1 clickable like-card">
        <div
          class="dating rounded-3 d-flex flex-column align-items-center justify-content-center p-2"
        >
          <div class="placeholder-chip ratio ratio-1x1 dating-eligible-highlight"></div>
          <small class="mt-1 w-100 text-center">
            <span class="placeholder w-75 opacity-25" />
          </small>
        </div>
      </div>
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
        {{ $t('matches.anonymous_like_hint_cta') }}
      </RouterLink>
    </div>
  </BPopover>
</template>

<style scoped>
.placeholder-chip {
  width: 2.5rem;
  background-color: var(--bs-secondary);
  opacity: 0.4;
}
.placeholder {
  opacity: 0.25;
  background-color: var(--bs-secondary);
}

.clickable {
  cursor: pointer;
}

.like-card:hover {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.15);
  border-radius: var(--bs-border-radius-lg);
}

:deep(.popover-hint) {
  min-width: 12rem;
}

.owner-thumb {
  width: 2.5rem;
  height: 2.5rem;
}
</style>
