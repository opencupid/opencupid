<script lang="ts" setup>
import { type ProfileScope } from '@zod/profile/profile.dto'

const currentScope = defineModel<ProfileScope | null>()

defineEmits({
  'edit:profile': () => true,
})
</script>

<template>
  <div
    class="d-flex flex-column align-items-center shadow-lg bg-theme user-select-none justify-content-center px-4 py-4 text-center"
  >
    <p v-if="currentScope === 'dating'">
      Your dating profile is currently private. To find matches, please make your profile public.
    </p>
    <p v-else-if="currentScope === 'social'">
      Your social profile is currently private. Please go to your profile and turn it  on.
    </p>
    <p v-else>Your profile is currently private.</p>
    <BButton
      @click="$emit('edit:profile')"
      variant="primary"
      size="lg"
      pill
      class="d-flex align-items-center justify-content-center"
      >Go to my profile</BButton
    >
  </div>
</template>
