<script lang="ts" setup>
import { computed, ref } from 'vue'
import { type InteractionContext } from '@zod/interaction/interactionContext.dto'

import IconHeart from '@/assets/icons/interface/heart.svg'
import IconCross from '@/assets/icons/interface/cross.svg'
import IconMessage from '@/assets/icons/interface/message.svg'
import ConfirmPassDialog from './ConfirmPassDialog.vue'

const props = defineProps<{
  context: InteractionContext
}>()

const emit = defineEmits<{
  (e: 'like', isAnonymous: boolean): void
  (e: 'pass'): void
  (e: 'message'): void
  (e: 'update:anonymous', isAnonymous: boolean): void
}>()

const passPopover = ref(false)

// Local ref tracks the radio selection — initialized from context when revisiting a liked profile
const selectedAnonymous = ref(props.context.isAnonymous)

const handleLikeClick = () => {
  // If the user has already liked the profile, do nothing
  if (props.context.likedByMe || !props.context.canLike) {
    return
  }
  emit('like', selectedAnonymous.value)
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

const handleAnonymousChange = (value: boolean) => {
  emit('update:anonymous', value)
}
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <div v-if="context.canDate">
      <BPopover
        v-model="passPopover"
        placement="top"
        title="Popover"
        body-class="bg-danger-subtle"
        manual
        click
        lazy
        title-class="d-none"
      >
        <template #target>
          <BButton
            variant="secondary"
            class="btn-icon-lg me-2 btn-shadow"
            @click="handlePassClick"
            :disabled="!context.canPass"
            :title="$t('interactions.pass_button_title')"
          >
            <IconCross class="svg-icon-lg" />
          </BButton>
        </template>
        <ConfirmPassDialog
          @yes="handleConfirmClick"
          @no="passPopover = false"
          :context="context"
        />
      </BPopover>
    </div>

    <!-- interaction action buttons popovers, message action -->
    <BPopover
      placement="top"
      title=""
      title-class="d-none"
    >
      <template #target>
        <BButton
          class="btn-icon-lg btn-info me-2 btn-shadow"
          @click="handleMessageClick"
          :title="$t('interactions.message_button_title')"
        >
          <IconMessage class="svg-icon-lg p-0" />
        </BButton>
      </template>
      <span v-if="props.context.canMessage">
        <!-- Send a message -->
        {{ $t('interactions.send_a_message') }}
      </span>
      <span v-else>
        <!-- You messaged them -->
        {{ $t('interactions.you_messaged_them') }}
      </span>
    </BPopover>

    <!-- interaction action buttons popovers, 'like' action -->
    <BPopover
      v-if="context.canDate"
      placement="top"
      title=""
      title-class="d-none"
    >
      <template #target>
        <BButton
          class="btn-icon-lg btn-dating btn-shadow"
          @click="handleLikeClick"
          :title="$t('interactions.like_button_title')"
        >
          <IconHeart class="svg-icon-lg" />
        </BButton>
      </template>
      <span v-if="context.isMatch">
        <IconHeart class="svg-icon text-dating" />
        {{ $t('interactions.you_matched_with_them') }}
      </span>
      <template v-else>
        <span
          v-if="context.likedByMe"
          class="mb-2 d-block"
        >
          <IconHeart class="svg-icon text-dating" />
          {{ $t('interactions.you_liked_them') }}
        </span>
        <span
          v-else
          class="mb-2 d-block"
        >
          {{ $t('interactions.send_a_like') }}
        </span>
        <BFormRadioGroup
          v-model="selectedAnonymous"
          stacked
        >
          <BFormRadio
            name="anonymous-toggle"
            :value="true"
            @change="context.likedByMe && handleAnonymousChange(true)"
          >
            {{ $t('interactions.anonymous_toggle_anonymous') }}
          </BFormRadio>
          <BFormRadio
            name="anonymous-toggle"
            :value="false"
            @change="context.likedByMe && handleAnonymousChange(false)"
          >
            {{ $t('interactions.anonymous_toggle_reveal') }}
          </BFormRadio>
        </BFormRadioGroup>
      </template>
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
