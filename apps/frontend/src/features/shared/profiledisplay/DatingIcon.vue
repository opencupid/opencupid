<script setup lang="ts">
import { type PublicProfile } from '@zod/profile/profile.dto'

defineProps<{
  profile: PublicProfile
}>()
</script>

<template>
  <DatingFilter :profile>
    <span class="text-dating">
      <FontAwesomeIcon icon="fa-solid fa-heart" />
    </span>
  </DatingFilter>
</template>
