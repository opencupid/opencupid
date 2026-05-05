<script lang="ts" setup>
import { ref, watch } from 'vue'
import { type InteractionContext } from '@zod/interaction/interactionContext.dto'

import IconLike from '@/assets/icons/emojis/smiling-emoji.svg'
import IconPass from '@/assets/icons/interface/cross.svg'
import IconMessage from '@/assets/icons/interface/message.svg'

import ConfirmPassDialog from './ConfirmPassDialog.vue'
import AnonymousToggle from './AnonymousToggle.vue'

import { tracker } from '@/lib/umami'

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

// Local ref tracks the radio selection — synced from context when it changes
const selectedAnonymous = ref(props.context.isAnonymous)
watch(
  () => props.context.isAnonymous,
  (val) => {
    selectedAnonymous.value = val
  }
)

const handleUpdateAnonymous = (isAnonymous: boolean) => {
  if (!props.context.likedByMe || isAnonymous === props.context.isAnonymous) {
    return
  }
  selectedAnonymous.value = isAnonymous
  tracker.track('interaction-update-like', { anonymous: isAnonymous })
  emit('update:anonymous', isAnonymous)
}

const handleCreateLikeClick = (isAnonymous: boolean) => {
  if (props.context.likedByMe || !props.context.canLike) {
    return
  }
  selectedAnonymous.value = isAnonymous
  tracker.track('interaction-create-like', { anonymous: isAnonymous })
  emit('like', isAnonymous)
}

const handleLikeBackClick = () => {
  if (props.context.likedByMe || !props.context.canLike) {
    return
  }
  tracker.track('interaction-like-back', { anonymous: selectedAnonymous.value })
  emit('like', selectedAnonymous.value)
}

const handlePassClick = () => {
  // If the user has already liked the profile, show confirmation popover
  if (props.context.likedByMe) {
    passPopover.value = true
    return
  }
  tracker.track('interaction-pass')
  emit('pass')
}

const handleConfirmClick = () => {
  passPopover.value = false
  emit('pass')
}

const handleMessageClick = () => {
  const context = props.context
  if (context.canMessage) {
    tracker.track('interaction-message')
    emit('message')
    return
  }
}
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <div v-if="context.canDate && !context.isMatch && context.likedByMe">
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
            <IconPass class="svg-icon-lg" />
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
          :class="{ 'opacity-50': !props.context.canMessage }"
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

    <!-- like popover: already liked by me -->
    <BPopover
      v-if="context.canDate && !context.isMatch && context.likedByMe"
      placement="top"
      style="min-width: 16rem; min-height: 14rem"
      body-class="d-flex align-items-center flex-column justify-items-center"
      :title="$t('interactions.you_liked_them')"
    >
      <template #target>
        <BButton class="btn-like">
          <IconLike class="svg-icon-lg" />
        </BButton>
      </template>
      <AnonymousToggle
        :selectedAnonymous="context.isAnonymous"
        @change="handleUpdateAnonymous"
      />
    </BPopover>

    <!-- like popover: they liked me (non-anonymous) -->
    <BPopover
      v-else-if="context.canDate && !context.isMatch && context.likedMeRevealed"
      placement="top"
    >
      <template #title>
        <span class="d-inline-flex w-100">
          <span class="flex-grow-1">
            {{ $t('interactions.they_liked_you') }}
          </span>
          <span class="flex-grow-0 text-dating flex-shrink-1">
            <IconLike class="svg-icon" />
          </span>
        </span>
      </template>

      <template #target>
        <BButton class="btn-like">
          <IconLike class="svg-icon-lg" />
        </BButton>
      </template>
      <span class="mb-2 d-block">
        <BButton
          class="btn-like-back"
          size="sm"
          @click="handleLikeBackClick"
        >
          <IconLike class="svg-icon" />

          {{ $t('interactions.like_them_back') }}
        </BButton>
      </span>
    </BPopover>

    <!-- like popover: send a like -->
    <BPopover
      v-else-if="context.canDate && !context.isMatch"
      placement="top"
      style="min-width: 16rem; min-height: 14rem"
    >
      <template #title>
        <span class="d-inline-flex w-100">
          <span class="flex-grow-1">
            {{ $t('interactions.send_a_like') }}
          </span>
          <span class="flex-grow-0 text-dating flex-shrink-1">
            <IconLike class="svg-icon" />
          </span>
        </span>
      </template>
      <template #target>
        <BButton class="btn-like">
          <IconLike class="svg-icon-lg" />
        </BButton>
      </template>
      <AnonymousToggle
        :selectedAnonymous="context.likedByMe ? context.isAnonymous : null"
        @change="handleCreateLikeClick"
      />
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
