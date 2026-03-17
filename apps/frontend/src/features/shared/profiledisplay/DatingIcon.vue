<script setup lang="ts">
import { type PublicProfile } from '@zod/profile/profile.dto'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faHeart } from '@fortawesome/free-solid-svg-icons'

defineProps<{
  profile: PublicProfile
}>()
</script>

<template>
  <DatingFilter :profile>
    <span class="text-dating">
      <FontAwesomeIcon :icon="faHeart" />
    </span>
  </DatingFilter>
</template>
