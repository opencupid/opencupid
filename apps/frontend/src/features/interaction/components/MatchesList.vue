<script setup lang="ts">
import { computed } from 'vue'
import { type InteractionEdge } from '@zod/interaction/interaction.dto'
import ProfileChipList from '@/features/shared/components/ProfileChipList.vue'

const props = defineProps<{ edges: InteractionEdge[] }>()
defineEmits<{
  (e: 'select:profile', profileId: string): void
}>()

const profiles = computed(() => props.edges.map((edge) => edge.profile))
</script>

<template>
  <ProfileChipList
    :profiles="profiles"
    @select:profile="$emit('select:profile', $event)"
  />
</template>
