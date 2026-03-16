<script setup lang="ts">
import { computed, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import PublicProfileComponent from '../components/PublicProfile.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

const props = defineProps<{ profileId: string }>()

const profileStore = useOwnerProfileStore()
provide(
  'viewerProfile',
  computed(() => profileStore.profile)
)
const router = useRouter()

const handleBack = () => {
  router.back()
}

const handleMessage = (conversationId: string) => {
  router.push({ name: 'Conversation', params: { conversationId } })
}

const handleHidden = () => {
  router.back()
}
</script>

<template>
  <main class="w-100 overflow-auto hide-scrollbar public-profile-view">
    <MiddleColumn
      class="pt-sm-3 position-relative flex-grow-1"
      style="min-height: 100%"
    >
      <PublicProfileComponent
        :id="profileId"
        class="shadow-lg mb-3 pb-5"
        @intent:back="handleBack"
        @intent:message="handleMessage"
        @hidden="handleHidden"
      />
    </MiddleColumn>
  </main>
</template>

