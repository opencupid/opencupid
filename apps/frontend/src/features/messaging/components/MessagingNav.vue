<script setup lang="ts">
import { type ProfileSummary } from '@zod/profile/profile.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

defineProps<{
  recipient: ProfileSummary
  allowCalls?: boolean
}>()

defineEmits<{
  (e: 'block:open'): void
  (e: 'deselect:convo'): void
  (e: 'profile:select', val: ProfileSummary): void
  (e: 'callable:toggle', event: Event): void
}>()
</script>

<template>
  <div class="d-flex align-items-center justify-content-between p-2">
    <div class="back-button">
      <a
        class="btn btn-secondary-outline fs-1"
        role="button"
        :title="$t('uicomponents.back_button_title')"
        @click="$emit('deselect:convo')"
      >
        <IconArrowSingleLeft class="svg-icon" />
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

    <div class="d-flex align-items-center gap-1">
      <BDropdown
        variant="link"
        no-caret
        toggle-class="text-decoration-none p-0 text-muted btn btn-secondary-outline action-button"
        end
      >
        <template #button-content>
          <IconMenuDotsVert class="svg-icon-lg fs-4" />
        </template>
        <BDropdownItem @click="$emit('block:open')">
          {{ $t('messaging.block_member') }}
        </BDropdownItem>
        <BDropdownDivider />
        <BDropdownForm>
          <label
            for="allow-calls-check"
            class="d-flex align-items-center justify-content-between w-100 mb-0"
          >
            {{ $t('calls.allow_calls_label') }}
            <input
              id="allow-calls-check"
              type="checkbox"
              class="form-check-input m-0"
              :checked="allowCalls"
              @change="$emit('callable:toggle', $event)"
            />
          </label>
        </BDropdownForm>
      </BDropdown>
    </div>
  </div>
</template>
