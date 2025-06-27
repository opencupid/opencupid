<script setup lang="ts">
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

// Props & Emits
const props = defineProps<{
  profile: PublicProfileWithContext
}>()
</script>

<template>
  <slot v-if="props.profile.scopes.includes('dating')" />
</template>
