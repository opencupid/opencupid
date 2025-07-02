<script setup lang="ts">
import { type InteractionEdge } from '@zod/interaction/interaction.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

defineProps<{ edges: InteractionEdge[] }>()
defineEmits<{
  (e: 'select:profile', profileId: string): void
}>()
</script>

<template>
  <BListGroup>
    <BListGroupItem
      v-for="edge in edges"
      :key="edge.profile.id"
      class="d-flex align-items-center mb-2 clickable"
      @click="$emit('select:profile', edge.profile.id)"
    >
      <ProfileThumbnail :profile="edge.profile" />
      <span class="ms-2">{{ edge.profile.publicName }}</span>
    </BListGroupItem>
  </BListGroup>
</template>
