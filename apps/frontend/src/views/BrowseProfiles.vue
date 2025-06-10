<script setup lang="ts">
import { reactive, onMounted, computed } from 'vue'
import { useProfileStore } from '@/store/profileStore'
import router from '@/router'

import { type PublicProfile } from '@zod/profile.schema'

import LoadingComponent from '@/components/LoadingComponent.vue'
import ProfileCardComponent from '@/components/profiles/public/ProfileCardComponent.vue'
import NoProfileInfoCTAComponent from '@/components/profiles/NoProfileInfoCTAComponent.vue'
import { useI18n } from 'vue-i18n'

const profileStore = useProfileStore()

// Define your component logic here
const state = reactive({
  profiles: [] as PublicProfile[],
  isLoading: false,
  error: null as string | null,
  showModal: false,
})
const { t } = useI18n()

onMounted(async () => {
  state.isLoading = true
  try {
    // Fetch profiles from the store
    const profiles = await profileStore.findProfiles()
    if (profiles != null) state.profiles = profiles
  } catch (error) {
    state.error = t('profile.fetch_error')
    state.showModal = true
    // console.error('Error fetching profiles:', error);
  } finally {
    state.isLoading = false
  }
})

const handleCardClick = (profile: PublicProfile) => {
  console.log('Card clicked:', profile)
  router.push({ name: 'PublicProfile', params: { id: profile.id } })
}
</script>

<template>
  <div>
    <div class="container">
      <div class="browse-profiles-view">
        <LoadingComponent v-if="state.isLoading" />

        <div class="container-fluid">
          <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
            <div v-for="profile in state.profiles" :key="profile.id" class="col">
              <ProfileCardComponent :profile="profile" @click="handleCardClick(profile)" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <BModal
      v-model="state.showModal"
      centered
      button-size="sm"
      :focus="false"
      :no-close-on-backdrop="true"
      :no-footer="true"
      :no-header="true"
      :cancel-title="t('uicomponents.modal.close')"
      initial-animation
      :title="t('profile.add_photo')"
    >
      <NoProfileInfoCTAComponent v-if="state.error" />
    </BModal>
  </div>
</template>
