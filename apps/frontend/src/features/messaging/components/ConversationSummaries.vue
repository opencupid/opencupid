<script setup lang="ts">
import { type ConversationSummary } from '@zod/messaging/messaging.dto'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import IconCross from '@/assets/icons/interface/cross.svg'
import IconUnhide from '@/assets/icons/interface/unhide.svg'
import { stripForPreview } from '@/lib/renderMessage'

defineProps<{
  conversations: ConversationSummary[]
  activeConversation: ConversationSummary | null
  loading: boolean
  loadingMore?: boolean
}>()

defineEmits<{
  (e: 'convo:select', val: ConversationSummary): void
  (e: 'convo:archive', val: ConversationSummary, isArchived: boolean): void
}>()

function turnOf(convo: ConversationSummary): 'mine' | 'theirs' | null {
  if (convo.isAdminInitiator || convo.isArchived) return null
  if (!convo.canReply) return 'theirs'
  return convo.lastMessage?.isMine ? null : 'mine'
}
</script>

<template>
  <div class="mb-3">
    <BListGroup>
      <TransitionGroup name="convo">
        <BListGroupItem
          v-for="convo in conversations"
          :key="convo.conversationId"
          :active="activeConversation?.conversationId === convo.conversationId"
          :class="{
            faded: convo.isArchived,
            admin: convo.isAdminInitiator,
          }"
          variant="light"
          class="convo-item cursor-pointer d-flex justify-content-start align-items-center mb-3 p-2 border-0 rounded-3 shadow user-select-none"
          @click="$emit('convo:select', convo)"
        >
          <div class="convo-content d-flex align-items-center flex-grow-1 overflow-hidden">
            <div class="thumbnail me-2 flex-shrink-0">
              <ProfileThumbnail :profile="convo.partnerProfile" />
            </div>
            <!--  extract into slot   -->
            <div class="overflow-hidden flex-grow-1">
              <div class="text-truncate fw-bold">{{ convo.partnerProfile.publicName }}</div>
              <small
                class="last-message d-block overflow-hidden text-nowrap"
                v-if="convo.lastMessage"
                >{{
                  convo.lastMessage.messageType === 'audio/voice'
                    ? $t('messaging.voice.voice_message_preview')
                    : stripForPreview(convo.lastMessage.content)
                }}</small
              >
            </div>
          </div>
          <BButton
            v-if="!convo.isAdminInitiator"
            size="sm"
            variant="secondary"
            class="archive-button flex-shrink-0 ms-2"
            :title="$t(convo.isArchived ? 'messaging.unhide_hint' : 'messaging.hide_hint')"
            :aria-label="$t(convo.isArchived ? 'messaging.unhide_hint' : 'messaging.hide_hint')"
            @click.stop="$emit('convo:archive', convo, !convo.isArchived)"
          >
            <span class="archive-label">{{
              $t(convo.isArchived ? 'messaging.unhide' : 'messaging.hide')
            }}</span>
            <IconUnhide
              v-if="convo.isArchived"
              class="archive-icon svg-icon"
            />
            <IconCross
              v-else
              class="archive-icon svg-icon"
            />
          </BButton>
          <small
            v-if="turnOf(convo) === 'mine'"
            class="turn-badge badge bg-danger"
            >{{ $t('messaging.my_turn') }}</small
          >
          <small
            v-else-if="turnOf(convo) === 'theirs'"
            class="turn-badge badge bg-secondary"
            >{{ $t('messaging.their_turn') }}</small
          >
        </BListGroupItem>
      </TransitionGroup>
    </BListGroup>
    <div
      v-if="loadingMore"
      class="text-center py-2"
      data-testid="conversations-loading-more"
    >
      <BSpinner
        small
        variant="secondary"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@bootstrap/scss/functions';
@import '@bootstrap/scss/variables';
@import '@bootstrap/scss/mixins';
@import '@/css/theme';

.last-message {
  -webkit-mask-image: linear-gradient(to left, transparent, #000 3rem);
  mask-image: linear-gradient(to left, transparent, #000 3rem);
}

// Only the content fades, so the hide button stays at full strength.
.faded .convo-content {
  opacity: 0.5;
}

.admin {
  background-color: transparentize($color: $info, $amount: 0.9);
}

// Hangs slightly off the item's top-right corner.
.turn-badge {
  position: absolute;
  top: -0.5rem;
  right: -0.25rem;
  font-size: 0.65rem;
  pointer-events: none;
}

.faded .turn-badge {
  opacity: 0.5;
}

.archive-icon {
  display: none;
}

// Until revealed the button takes no space and no clicks, but stays focusable.
@media (hover: hover) {
  .convo-item:not(:hover) .archive-button:not(:focus-visible) {
    position: absolute;
    right: 0.5rem;
    opacity: 0;
    pointer-events: none;
  }
}

// No hover on touch screens: a compact icon, always visible.
@media (hover: none) {
  .archive-label {
    display: none;
  }

  .archive-icon {
    display: block;
  }

  .archive-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    margin: 0 -0.25rem 0 0;
    border: 0;
    color: inherit;
    background: none;
    opacity: 0.6;
  }
}

.convo-move {
  transition: transform 0.3s ease;
}
</style>
