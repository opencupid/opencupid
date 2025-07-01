<script lang="ts" setup>
import { computed, ref } from 'vue'
import { I18nT } from 'vue-i18n'
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

const handleLikeClick = () => {
  // If the user has already liked the profile, do nothing
  if (props.context.likedByMe || !props.context.canLike) {
    return
  }
  emit('like')
}

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

const handleMessageClick = () => {
  const context = props.context
  if (context.canMessage) {
    emit('message')
    return
  }
}
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <div v-if="context.canDate">
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
    </div>

    <BPopover v-if="context.canDate" placement="top" title="" title-class="d-none">
      <template #target>
        <BButton class="btn-icon-lg btn-info me-2" @click="handleMessageClick">
          <IconMessage class="svg-icon-lg p-0" />
        </BButton>
      </template>
      <span v-if="props.context.canMessage">Send a message</span>
      <span v-else>You messaged them</span>
    </BPopover>

    <BPopover v-if="context.canDate" placement="top" title="" title-class="d-none">
      <template #target>
        <BButton class="btn-icon-lg btn-dating" @click="handleLikeClick">
          <IconHeart class="svg-icon-lg" />
        </BButton>
      </template>
      <span v-if="context.isMatch">
        You matched with them! <IconHeart class="svg-icon text-dating" />
      </span>
      <span v-else-if="context.likedByMe">
        You <IconHeart class="svg-icon text-dating" /> them!

        <!-- TODO fix this -->
        <!-- <i18n-t
        keypath="profiles.interactions.you_liked_them"
        :components="{ icon: IconHeart }"
        tag="span"
      >
      </i18n-t> -->
      </span>
      <span v-else>
        Send them a like. They will will not know who sent it until they like you back.
      </span>
    </BPopover>
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
