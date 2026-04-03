<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import NotificationDot from '@/features/shared/ui/NotificationDot.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconUser from '@/assets/icons/interface/user.svg'

defineOptions({ name: 'OwnerDrawerControls' })

defineEmits<{
  'open:inbox': []
  'open:profile': []
}>()

const ownerProfileStore = useOwnerProfileStore()
const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()
</script>

<template>
  <div
    class="owner-drawer-controls position-absolute top-0 end-0 p-2 d-flex gap-2"
    style="z-index: 1010"
  >
    <button
      type="button"
      class="btn btn-light btn-sm rounded-circle shadow-sm p-0 overflow-hidden"
      style="width: 2.5rem; height: 2.5rem"
      :aria-label="$t('nav.inbox')"
      @click="$emit('open:inbox')"
    >
      <NotificationDot :show="hasUnreadMessages || hasMatchNotifications">
        <IconMessage class="svg-icon" />
      </NotificationDot>
    </button>
    <button
      type="button"
      class="btn btn-light btn-sm rounded-circle shadow-sm p-0 overflow-hidden"
      style="width: 2.5rem; height: 2.5rem"
      :aria-label="$t('nav.profile')"
      @click="$emit('open:profile')"
    >
      <ProfileImage
        v-if="ownerProfileStore.profile?.profileImages?.length"
        :profile="ownerProfileStore.profile"
        variant="thumb"
        class="img-fluid w-100 h-100"
      />
      <IconUser
        v-else
        class="svg-icon"
      />
    </button>
  </div>
</template>
