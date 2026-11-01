<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Explains that without a face photo the viewer can't see others' photos
 * (see useProfilePhotoAccess). Shared by the onboarding photo step and the
 * profile photo editor. Callers decide when to show it and may add actions.
 */
defineProps<{
  /** Whether the gallery has any photo (picks "no face" vs "no photo" wording). */
  hasPhoto: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="alert alert-warning mt-3 text-center"
    role="alert"
    data-testid="no-face-warning"
  >
    <p :class="$slots.actions ? 'mb-2' : 'mb-0'">
      {{
        hasPhoto ? t('onboarding.photos_no_face_warning') : t('onboarding.photos_missing_warning')
      }}
    </p>
    <div
      v-if="$slots.actions"
      class="d-flex flex-wrap justify-content-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
