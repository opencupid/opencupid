<script setup lang="ts">
import { computed, inject, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { usePublicProfileStore } from '../stores/publicProfileStore'
import PublicProfileComponent from '../components/PublicProfile.vue'
import BlockProfileDialog from '../components/BlockProfileDialog.vue'

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

watch(
  () => props.profileId,
  async (id) => {
    isLoaded.value = false
    await useBootstrap().bootstrap()
    await publicProfileStore.getPublicProfile(id)
    isLoaded.value = true
  },
  { immediate: true }
)

// When rendered inside DetailPanelOrchestrator, close the panel cleanly.
// Otherwise, navigate to a deterministic landing route — never router.back(),
// which can pop out of the SPA entirely on cold-start deep-links.
const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
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
  handleBack()
}
</script>

<template>
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

    <div v-if="isLoaded" class="h-100">
      <PublicProfileComponent
        v-if="publicProfileStore.profile"
        :profile="publicProfileStore.profile"
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

  <BlockProfileDialog
    v-if="publicProfileStore.profile"
    :profile="publicProfileStore.profile"
    v-model="showBlockModal"
    :loading="publicProfileStore.isLoading"
    @block="handleBlock"
  />
</template>
