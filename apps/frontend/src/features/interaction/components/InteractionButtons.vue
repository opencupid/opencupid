<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { type InteractionContext } from '@zod/interaction/interactionContext.dto'

import IconHeart from '@/assets/icons/interface/heart.svg'
import IconCross from '@/assets/icons/interface/cross.svg'
import IconMessage from '@/assets/icons/interface/message.svg'
import AnonymousToggle from './AnonymousToggle.vue'
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

// Local ref tracks the radio selection — synced from context when it changes
const selectedAnonymous = ref(props.context.isAnonymous)
watch(
  () => props.context.isAnonymous,
  (val) => {
    selectedAnonymous.value = val
  }
)

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
    <div v-if="context.canDate && !context.isMatch">
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

    <!-- like popover: already liked by me -->
    <BPopover
      v-if="context.canDate && !context.isMatch && context.likedByMe"
      placement="top"
      :title="$t('interactions.you_liked_them')"
    >
      <template #target>
        <BButton
          class="btn-icon-lg btn-dating btn-shadow"
          :title="$t('interactions.like_button_title')"
        >
          <IconHeart class="svg-icon-lg" />
        </BButton>
      </template>
      <AnonymousToggle
        v-model="selectedAnonymous"
        @change="handleAnonymousChange"
      />
    </BPopover>

    <!-- like popover: they liked me (non-anonymous) -->
    <BPopover
      v-else-if="context.canDate && !context.isMatch && context.likedMeRevealed"
      placement="top"
      :title="$t('interactions.they_liked_you')"
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
      <span class="mb-2 d-block">
        {{ $t('interactions.like_them_back') }}
      </span>
    </BPopover>

    <!-- like popover: send a like -->
    <BPopover
      v-else-if="context.canDate && !context.isMatch"
      placement="top"
      :title="$t('interactions.send_a_like')"
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
      <AnonymousToggle v-model="selectedAnonymous" />
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
