<script setup lang="ts">
defineProps<{ profileId: string }>()

const frontendUrl = __APP_CONFIG__.FRONTEND_URL
</script>

<template>
  <a
    :href="`${frontendUrl}/profile/${profileId}`"
    target="_blank"
    rel="noopener noreferrer"
    class="btn btn-sm btn-outline-primary"
    data-testid="view-public-profile"
    >Profile</a
  >
</template>
