<script setup lang="ts">
import { type InteractionEdge } from '@zod/interaction/interaction.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

defineProps<{ edges: InteractionEdge[] }>()
</script>

<template>
  <BListGroup>
    <BListGroupItem
      v-for="edge in edges"
      :key="edge.profile.id"
      class="d-flex align-items-center gap-2"
    >
      <ProfileThumbnail :profile="edge.profile" />
      <span>{{ edge.profile.publicName }}</span>
    </BListGroupItem>
  </BListGroup>
</template>
