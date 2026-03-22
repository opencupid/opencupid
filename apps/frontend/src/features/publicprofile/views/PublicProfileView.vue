<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { usePublicProfileStore } from '../stores/publicProfileStore'
import PublicProfileComponent from '../components/PublicProfile.vue'
import BlockProfileDialog from '../components/BlockProfileDialog.vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const props = defineProps<{ profileId: string }>()

const profileStore = useOwnerProfileStore()
const publicProfileStore = usePublicProfileStore()

provide(
  'viewerProfile',
  computed(() => profileStore.profile)
)

const showBlockModal = ref(false)
const isLoaded = ref(false)

onMounted(async () => {
  await useBootstrap().bootstrap()
  await publicProfileStore.getPublicProfile(props.profileId)
  isLoaded.value = true
})

const handleBack = () => {
  router.back()
}

const handleMessage = (conversationId: string) => {
  router.push({ name: 'Conversation', params: { conversationId } })
}

const handleRefresh = async () => {
  await publicProfileStore.getPublicProfile(props.profileId)
}

const handleBlock = async () => {
  const res = await publicProfileStore.blockProfile(props.profileId)
  showBlockModal.value = false
  if (res.success) {
    toast.info(t('profiles.blocklist.block_confirm_message'))
  }
  router.back()
}
</script>

<template>
  <main class="w-100 overflow-auto hide-scrollbar public-profile-view">
    <MiddleColumn class="pt-sm-3 position-relative px-0 px-sm-3">
      <BPlaceholderWrapper :loading="publicProfileStore.isLoading">
        <template #loading>
          <BPlaceholderCard
            class="w-100 opacity-50"
            style="min-height: 100%"
            img-height="400"
            animation="glow"
            no-button
          />
        </template>

        <div v-if="isLoaded">
          <PublicProfileComponent
            v-if="publicProfileStore.profile"
            :profile="publicProfileStore.profile"
            class="shadow-lg mb-3 pb-5"
            @intent:back="handleBack"
            @intent:message="handleMessage"
            @intent:block="showBlockModal = true"
            @updated="handleRefresh"
          />
          <div
            v-else
            class="text-center py-5"
          >
            <p class="text-muted">{{ $t('profiles.profile_not_found') }}</p>
            <BButton
              variant="primary"
              @click="handleBack"
            >
              {{ $t('profiles.back_button_title') }}
            </BButton>
          </div>
        </div>
      </BPlaceholderWrapper>
    </MiddleColumn>

    <BlockProfileDialog
      v-if="publicProfileStore.profile"
      :profile="publicProfileStore.profile"
      v-model="showBlockModal"
      :loading="publicProfileStore.isLoading"
      @block="handleBlock"
    />
  </main>
</template>
