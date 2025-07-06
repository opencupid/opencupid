<script setup lang="ts">
import IconConfusedEmoji from '@/assets/icons/emojis/confused-emoji.svg'
import IconSurprisedEmoji from '@/assets/icons/emojis/surprised-emoji.svg'
import { type InteractionContext } from '@zod/interaction/interactionContext.dto'

defineProps<{
  context: InteractionContext
}>()

defineEmits<{
  (e: 'yes'): void
  (e: 'no'): void
}>()
</script>
<template>
  <div class="d-flex flex-column align-items-center justify-content-center p-3">
    <div
      v-if="context.isMatch"
      class="d-flex align-items-center flex-column justify-content-center mb-2"
    >
        <!-- interactions match pass confirmation  dialog -->
      <div style="width: 5rem; height: 5rem" class="mb-2">
        <IconSurprisedEmoji class="svg-icon-100 text-warning" />
      </div>
      <h3>But wait...</h3>
      <p class="text-center">
        You already matched with them. Do you REALLY want to unmatch?
      </p>

      <BButton variant="danger" size="sm" @click="$emit('yes')" class="mb-2 px-3">
        Yes, unmatch
      </BButton>
      <BButton class="btn btn-link text-decoration-none" size="sm" @click="$emit('no')">
        No!
      </BButton>
    </div>

        <!-- interactions match pass confirmation  dialog -->
    <div v-else class="d-flex align-items-center flex-column justify-content-center mb-2">
      <div style="width: 5rem; height: 5rem" class="mb-2">
        <IconConfusedEmoji class="svg-icon-100 text-warning" />
      </div>
      <h3>But wait...</h3>
      <p class="text-center">You already liked them. Are you sure you want to pass?</p>

      <BButton variant="danger" size="sm" @click="$emit('yes')" class="mb-2 px-3">
        Yes, pass
      </BButton>
      <BButton class="btn btn-link text-decoration-none" size="sm" @click="$emit('no')">
        No, don't pass
      </BButton>
    </div>
  </div>
</template>
