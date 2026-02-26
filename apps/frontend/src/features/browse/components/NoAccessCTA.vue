<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { type ProfileScope } from '@zod/profile/profile.dto'

defineProps<{
  scope: ProfileScope
}>()

defineEmits(['edit:profile'])

const { t } = useI18n()
</script>

<template>
  <div
    class="d-flex flex-column align-items-center shadow-lg bg-theme user-select-none justify-content-center px-4 py-4"
  >
    <div v-if="scope === 'dating'">
      <h5>{{ t('profiles.browse.no_access_dating_title') }}</h5>
      <p class="text-muted">
        {{ t('profiles.browse.no_access_dating_description') }}
      </p>
    </div>
    <div v-else-if="scope === 'social'">
      <h5>{{ t('profiles.browse.no_access_social_title') }}</h5>
      <p class="text-muted">
        {{ t('profiles.browse.no_access_social_description') }}
      </p>
    </div>
    <BButton
      @click="$emit('edit:profile')"
      variant="primary"
      size="lg"
      pill
      class="d-flex align-items-center justify-content-center"
    >
      {{ t('profiles.browse.cta_button_label') }}
    </BButton>
  </div>
</template>
