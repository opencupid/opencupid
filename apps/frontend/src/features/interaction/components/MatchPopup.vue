<script lang="ts" setup>
import { type InteractionEdgePair } from '@zod/interaction/interaction.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import ProfileImage from '@/features/images/components/ProfileImage.vue'
import ContactFormPanel from '@/features/messaging/components/ContactFormPanel.vue'
import { ref } from 'vue'

defineProps<{
  profile: PublicProfileWithContext
  match: InteractionEdgePair
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'messaged'): void
}>()

const isMessageSent = ref(false)

const handleSent = () => {
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
      <div class="d-flex flex-row align-items-center justify-content-center mb-4">
        <div class="image-wrapper">
          <ProfileImage
            :profile="match.from.profile"
            variant="thumb"
          />
        </div>

        <div class="image-wrapper right">
          <ProfileImage
            :profile="match.to.profile"
            variant="thumb"
          />
        </div>
      </div>
      <div
        v-if="profile.interactionContext.canMessage"
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

<style scoped lang="scss">
.image-wrapper {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.8);
}
.right {
  margin-left: -1.5rem;
  margin-right: 0;
}
</style>

<!--
  Unscoped: BModal teleports content-class target to <body>, so a scoped
  selector (or :deep()) cannot reach it. --bs-dating-light is emitted at
  :root by Bootstrap's _root.scss from $dating-light in theme.scss.
-->
<style lang="scss">
.match-popup-content {
  background-color: var(--bs-dating-light);
  transition: background-color 300ms ease-in-out;
}
.match-popup-content.sent {
  background-color: white;
}

</style>
