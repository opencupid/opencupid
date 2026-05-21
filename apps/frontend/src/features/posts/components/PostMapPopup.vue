<script setup lang="ts">
import type { PublicPostDetail } from '@zod/post/post.dto'
import UserContentMapPopup from '@/features/userContent/components/UserContentMapPopup.vue'

defineProps<{ item: PublicPostDetail }>()
</script>

<template>
  <UserContentMapPopup :item="item">
    <template #content>
      <div class="post-map-popup bg-post-light p-3">
        {{ (item.content ?? '').substring(0, 120) }}
      </div>
    </template>
  </UserContentMapPopup>
</template>

<style scoped>
.post-map-popup {
  font-family: 'Patrick Hand', cursive;
  font-size: 0.85rem;
}
</style>
