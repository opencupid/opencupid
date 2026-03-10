<script setup lang="ts">
import { computed } from 'vue'
import { type InteractionEdge } from '@zod/interaction/interaction.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'

const props = defineProps<{ edges: InteractionEdge[] }>()
defineEmits<{
  (e: 'select:profile', profileId: string): void
}>()

const profiles = computed(() => props.edges.map((edge) => edge.profile))
</script>

<template>
  <BListGroup>
    <BListGroupItem
      v-for="profile in profiles"
      :key="profile.id"
      variant="light"
      class="dating d-flex align-items-center mb-3 p-2 border-0 rounded-3 shadow cursor-pointer user-select-none"
      @click="$emit('select:profile', profile.id)"
    >
      <div class="me-2 flex-shrink-0">
        <ProfileThumbnail :profile="profile" />
      </div>
      <div class="text-truncate fw-bold">{{ profile.publicName }}</div>
    </BListGroupItem>
  </BListGroup>
</template>
