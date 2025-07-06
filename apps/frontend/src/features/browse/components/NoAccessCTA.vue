<script lang="ts" setup>
import { type ProfileScope } from '@zod/profile/profile.dto'

const currentScope = defineModel<ProfileScope | null>()

defineEmits(['edit:profile'])
</script>

<template>
  <div
    class="d-flex flex-column align-items-center shadow-lg bg-theme user-select-none justify-content-center px-4 py-4"
  >
    <div v-if="currentScope === 'dating'">
      <!-- Your own dating profile is currently private -->
      <h5>{{ $t('profiles.browse.no_access_dating_title') }}</h5>
      <p class="text-muted">
        <!-- When others can't see you... -->
        {{ $t('profiles.browse.no_access_dating_description') }}
      </p>
    </div>
    <div v-else-if="currentScope === 'social'">
      <!-- Your own social profile is currently private -->
      <h5>{{ $t('profiles.browse.no_access_social_title') }}</h5>
      <p class="text-muted">
        <!-- When others can't see you... -->
        {{ $t('profiles.browse.no_access_social_description') }}
      </p>
    </div>
    <BButton
      @click="$emit('edit:profile')"
      variant="primary"
      size="lg"
      pill
      class="d-flex align-items-center justify-content-center"
    >
      <!-- Go to my profile -->
      {{ $t('profiles.browse.cta_button_label') }}
    </BButton>
  </div>
</template>
