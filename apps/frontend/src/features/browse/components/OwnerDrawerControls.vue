<script setup lang="ts">
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import NotificationDot from '@/features/shared/ui/NotificationDot.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconUser from '@/assets/icons/interface/user.svg'
import { useRouter } from 'vue-router'
import UserContentCreateSpeedDial from '@/features/userContent/components/UserContentCreateSpeedDial.vue'

defineOptions({ name: 'OwnerDrawerControls' })

defineEmits<{
  'open:inbox': []
  'open:profile': []
}>()

const ownerProfileStore = useOwnerProfileStore()
const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()

const router = useRouter()

function openCreatePost() {
  router.push({ name: 'MeCreatePost' })
}

function openCreateEvent() {
  router.push({ name: 'MeCreateEvent' })
}

function openCreateCommunity() {
  router.push({ name: 'MeCreateCommunity' })
}
</script>

<template>
  <div class="owner-drawer-controls d-flex flex-column flex-md-row gap-2">
    <BButton
      variant="light"
      class="btn-rounded shadow overflow-hidden order-1 order-md-0 border"
      :aria-label="$t('nav.inbox')"
      @click="$emit('open:inbox')"
    >
      <NotificationDot :show="hasUnreadMessages || hasMatchNotifications">
        <IconMessage class="svg-icon" />
      </NotificationDot>
    </BButton>
    <BButton
      variant="light"
      class="btn-rounded p-0 shadow overflow-hidden"
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

    <UserContentCreateSpeedDial
      class="order-2"
      trigger-class="btn-rounded shadow"
      action-class="btn-rounded shadow bg-light"
      @create:post="openCreatePost"
      @create:event="openCreateEvent"
      @create:community="openCreateCommunity"
    />
  </div>
</template>
