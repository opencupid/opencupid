<script lang="ts" setup>
import { type InteractionEdgePair } from '@zod/interaction/interaction.dto'
import { type PublicProfile } from '@zod/profile/profile.dto'

import MatchPair from './MatchPair.vue'
import ContactFormPanel from '@/features/messaging/components/ContactFormPanel.vue'
import { ref } from 'vue'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const props = defineProps<{
  profile: PublicProfile
  match: InteractionEdgePair
  show: boolean
}>()

const { contextFor } = useInteractionsViewModel()
const context = contextFor(props.profile.id)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'messaged'): void
}>()

const isMessageSent = ref(false)

const handleSent = () => {
  isMessageSent.value = false
  emit('messaged')
  emit('close')
}

const handleSubmitted = () => {
  isMessageSent.value = true
}
</script>

<template>
  <BModal
    :model-value="show"
    size="md"
    fullscreen="md"
    centered
    :focus="false"
    :no-close-on-backdrop="true"
    :no-footer="true"
    :no-header="true"
    :lazy="true"
    initial-animation
    :content-class="['match-popup-content', { sent: isMessageSent }]"
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden p-0"
    :keyboard="false"
  >
    <div class="w-100 p-5">
      <h6 class="display-6 text-center mb-4">
        <!-- It's a match! -->
        {{ $t('interactions.its_a_match') }}
      </h6>
      <MatchPair
        class="mb-4"
        :left="match.from.profile"
        :right="match.to.profile"
      />
      <div
        v-if="context?.canMessage"
        class="text-center"
      >
        <h6 class="text-center mb-3">
          <!-- send {them} a messages -->
          {{ $t('interactions.send_them_a_message', { name: profile.publicName }) }}
        </h6>
        <ContactFormPanel
          :recipient-profile="profile"
          @sent="handleSent"
          @submitted="handleSubmitted"
        />
        <BButton
          variant="secondary"
          size="sm"
          @click="emit('close')"
          v-if="!isMessageSent"
        >
          <!-- Maybe later -->
          {{ $t('interactions.cancel_button') }}
        </BButton>
      </div>
    </div>
  </BModal>
</template>

<!--
  Unscoped: BModal teleports content-class target to <body>, so a scoped
  selector (or :deep()) cannot reach it. The match wash is a layer of its
  own so it can fade out once the message is sent.
-->
<style lang="scss">
.match-popup-content {
  background-color: var(--surface-inset-bg);
  isolation: isolate;
}
.match-popup-content::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background-color: var(--dating-tint);
  transition: opacity 300ms ease-in-out;
}
.match-popup-content.sent::before {
  opacity: 0;
}
</style>
