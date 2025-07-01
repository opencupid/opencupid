<script lang="ts" setup>
import { ref } from 'vue'

import { type InteractionContext } from '@zod/interaction/interactionContext.dto'

import IconHeart from '@/assets/icons/interface/heart.svg'
import IconCross from '@/assets/icons/interface/cross.svg'
import IconMessage from '@/assets/icons/interface/message.svg'
import ConfirmPassDialog from './ConfirmPassDialog.vue'

const props = defineProps<{
  context: InteractionContext
}>()

const emit = defineEmits<{
  (e: 'like'): void
  (e: 'pass'): void
  (e: 'message'): void
}>()

const passPopover = ref(false)

const handlePassClick = () => {
  // If the user has already liked the profile, show confirmation popover
  if (props.context.likedByMe) {
    passPopover.value = true
    return
  }
  emit('pass')
}

const handleConfirmClick = () => {
  passPopover.value = false
  emit('pass')
}
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <BPopover
      v-model="passPopover"
      placement="top"
      title="Popover"
      manual
      click
      lazy
      title-class="d-none"
    >
      <template #target>
        <BButton
          variant="secondary"
          class="btn-icon-lg me-2"
          @click="handlePassClick"
          :disabled="!context.canPass"
        >
          <IconCross class="svg-icon-lg" />
        </BButton>
      </template>
      <ConfirmPassDialog @yes="handleConfirmClick" @no="passPopover = false" :context="context" />
    </BPopover>

    <BButton class="btn-icon-lg btn-info me-2" @click="$emit('message')">
      <IconMessage class="svg-icon-lg p-0" />
    </BButton>

    <BButton
      v-if="!context.isMatch"
      class="btn-icon-lg btn-dating"
      @click="$emit('like')"
      :disabled="!context.canLike"
    >
      <IconHeart class="svg-icon-lg" />
    </BButton>
  </div>
</template>

<style scoped>
:deep(.popover) {
  box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.4);
  /* background-color: var(--bs-danger); */
}
:deep(.popover-arrow) {
  border-top-color: var(--bs-danger) !important;
}
</style>
