<script setup lang="ts">
import photoEmptyUrl from '@/assets/images/app/photo-empty.svg?url'

/**
 * Silhouette for a profile with no photos, shown to viewers allowed to see photos.
 * Viewers who may not see photos get HiddenProfilePhoto instead.
 */
const emit = defineEmits<{ load: [] }>()
</script>

<template>
  <img
    :src="photoEmptyUrl"
    alt=""
    class="empty-profile-photo"
    data-testid="empty-profile-photo"
    @load="emit('load')"
  />
</template>

<style scoped>
.empty-profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
