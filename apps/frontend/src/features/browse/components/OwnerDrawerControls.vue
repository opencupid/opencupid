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
  <div class="owner-drawer-controls d-flex flex-column flex-md-row gap-2">
    <BButton
      variant="light"
      class="btn-sm rounded-circle shadow p-0 overflow-hidden"
      style="width: 2.5rem; height: 2.5rem"
      :aria-label="$t('nav.inbox')"
      @click="$emit('open:inbox')"
    >
      <NotificationDot :show="hasUnreadMessages || hasMatchNotifications">
        <IconMessage class="svg-icon" />
      </NotificationDot>
    </BButton>
    <BButton
      variant="light"
      class="btn-sm rounded-circle shadow p-0 overflow-hidden"
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
    </BButton>
  </div>
</template>
