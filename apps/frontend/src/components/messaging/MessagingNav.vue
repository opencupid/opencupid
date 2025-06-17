<script setup lang="ts">
import DoodleIcons from '@/components/icons/DoodleIcons.vue'
import { type ProfileSummary } from '@zod/profile/profile.dto'
import ProfileThumbnail from '../profiles/image/ProfileThumbnail.vue'

defineProps<{
  recipient: ProfileSummary
}>()

defineEmits<{
  (e: 'modal:open'): void
  (e: 'deselect:convo'): void
  (e: 'profile:select', val: ProfileSummary): void
}>()
</script>

<template>
  <div class="d-flex align-items-center justify-content-between p-2">
    <div class="back-button">
      <a class="btn btn-secondary-outline fs-1" @click="$emit('deselect:convo')">
        <DoodleIcons name="IconArrowSingleLeft" class="svg-icon" />
      </a>
    </div>

    <div
      @click="$emit('profile:select', recipient)"
      class="d-flex flex-column align-items-center justify-content-center cursor-pointer user-select-none"
    >
      <div class="thumbnail">
        <ProfileThumbnail :profile="recipient" />
      </div>
      <div class="">
        <div class="fs-6">{{ recipient.publicName }}</div>
      </div>
    </div>

    <div class="action-button">
      <a class="btn btn-secondary-outline" @click="$emit('modal:open')">
        <DoodleIcons name="IconMenuDotsVert" class="svg-icon-lg fs-4" />
      </a>
    </div>
  </div>
</template>
