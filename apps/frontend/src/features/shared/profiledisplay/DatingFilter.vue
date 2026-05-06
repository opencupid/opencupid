<script setup lang="ts">
import { type PublicProfile } from '@zod/profile/profile.dto'

// Props & Emits
const props = defineProps<{
  profile: PublicProfile
}>()
</script>

<template>
  <slot v-if="props.profile.isDatingActive" />
</template>
