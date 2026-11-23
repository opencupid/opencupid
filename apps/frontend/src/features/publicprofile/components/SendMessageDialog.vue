<script setup lang="ts">
import { nextTick, ref } from 'vue'

import { type PublicProfile } from '@zod/profile/profile.dto'

import ProfileMarker from './ProfileMarker.vue'
import ContactFormPanel from '@/features/messaging/components/ContactFormPanel.vue'

const showModal = defineModel<boolean>()

defineProps<{
  profile: PublicProfile
}>()

const emit = defineEmits<{
  (e: 'sent'): void
}>()

const messageInput = ref<InstanceType<typeof ContactFormPanel> | null>(null)

const handleSent = () => {
  showModal.value = false
  emit('sent')
}

const handleModalShown = () => {
  nextTick(() => {
    setTimeout(() => {
      messageInput.value?.focusTextarea()
    }, 50)
  })
}
</script>

<template>
  <BModal
    v-model="showModal"
    title=""
    size="lg"
    fullscreen="sm"
    centered
    :no-footer="true"
    initial-animation
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
    :keyboard="false"
    @shown="handleModalShown"
  >
    <template #title>
      <h6 class="d-flex align-items-center m-0">
        <RouterLink
          :to="{ name: 'PublicProfile', params: { profileId: profile.id } }"
          class="d-flex align-items-center text-decoration-none text-reset"
          @click="showModal = false"
        >
          <ProfileMarker
            :profile="profile"
            :highlighted="profile.isDatingActive"
            class="me-2 flex-shrink-0"
          />
          {{
            $t('messaging.send_message_to_user', {
              name: profile.publicName || '',
            })
          }}
        </RouterLink>
      </h6>
    </template>
    <ContactFormPanel
      v-if="showModal"
      ref="messageInput"
      :recipient-profile="profile"
      :show-tags="true"
      :no-resize="false"
      @sent="handleSent"
    />
  </BModal>
</template>
