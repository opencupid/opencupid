<script setup lang="ts">
import { type PublicProfile, type PublicProfileWithContext } from '@zod/profile/profile.dto'

const props = defineProps<{
  profile: PublicProfile
}>()
</script>

<template>
  <ul
    class="tags list-unstyled mb-0 d-inline-flex flex-wrap align-items-center"
    v-if="props.profile.tags && props.profile.tags.length"
  >
    <li v-for="tag in props.profile.tags" :key="tag.slug" class="me-2">
      <BBadge variant="warning">#{{ tag.name }}</BBadge>
    </li>
  </ul>
</template>
