<script lang="ts" setup>
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconCross from '@/assets/icons/interface/cross.svg'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import InteractionButtons from './InteractionButtons.vue'
import { computed } from 'vue';

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

defineEmits<{
  (e: 'intent:like'): void
  (e: 'intent:pass'): void
  (e: 'intent:message'): void
}>()

const canMessage = computed(() => {
  return !props.profile.conversation || props.profile.conversation.status === 'ACCEPTED'
})
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <InteractionButtons @message="$emit('intent:message')" @pass="$emit('intent:pass')" @like="$emit('intent:like')" />
  </div>
</template>
