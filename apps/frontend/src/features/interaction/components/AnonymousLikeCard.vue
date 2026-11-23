<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import ProfileMarker from '@/features/publicprofile/components/ProfileMarker.vue'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { GenderType } from '@zod/generated/inputTypeSchemas/GenderSchema'
import IconSearch from '@/assets/icons/interface/search.svg'
import AnonymousProfileChip from './AnonymousProfileChip.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

const viewerProfile = inject<Ref<OwnerProfile | null>>('viewerProfile')

const { datingPrefs } = storeToRefs(useOwnerProfileStore())

const likerGender = computed<GenderType | undefined>(() => {
  const prefs = datingPrefs.value.prefGender ?? []
  if (prefs.includes('male')) return 'male'
  if (prefs.includes('female')) return 'female'
  return undefined
})
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
      <AnonymousProfileChip
        class="clickable"
        :gender="likerGender"
      />
    </template>
    <p class="mb-2">
      {{ $t('matches.anonymous_like_hint') }}
    </p>
    <div class="d-flex flex-column align-items-center justify-content-center gap-1 mb-2">
      <ProfileMarker
        v-if="viewerProfile"
        :profile="viewerProfile"
        highlighted
        class="mb-2"
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
</style>
