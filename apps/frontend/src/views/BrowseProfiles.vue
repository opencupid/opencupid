<script setup lang="ts">
import { useRouter } from 'vue-router'
import { reactive, onMounted, computed, ref } from 'vue'
import { useProfileStore } from '@/store/profileStore'

import { type PublicProfile, type PublicProfileWithConversation } from '@zod/profile/profile.dto'

import LoadingComponent from '@/components/LoadingComponent.vue'
import ProfileCardComponent from '@/components/profiles/public/ProfileCardComponent.vue'
import NoProfileInfoCTAComponent from '@/components/profiles/NoProfileInfoCTA.vue'
import InvitePeopleDialog from '@/components/profiles/public/InvitePeopleDialog.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import IconSetting from '@/assets/icons/interface/setting.svg'
import ErrorOverlay from '@/components/ErrorOverlay.vue'
import DatingPreferencesForm from '@/components/profiles/browse/DatingPreferencesForm.vue'
import { useAgeFields } from '@/components/profiles/composables/useAgeFields'
import { useProfileBrowserStore } from '@/store/matchStore'
import ScopeViewToggler from '@/components/profiles/ScopeViewToggler.vue'
import SecondaryNav from '@/components/profiles/match/SecondaryNav.vue'

const router = useRouter()
const profileStore = useProfileStore()
const profileBrowserStore = useProfileBrowserStore()
// state management
const error = ref<string | null>('')
const showModal = ref(false)
const showPrefs = ref(false)

const haveProfiles = computed(() => {
  return profileBrowserStore.profileList.length > 0
})

onMounted(async () => {
  const res = await profileBrowserStore.findProfiles()
  // access issue
  if (!res.success) {
    error.value = res.message
    showModal.value = true
    return
  }
  const pres = await profileBrowserStore.fetchDatingPrefs()
  const ppres = await profileStore.fetchOwnerProfile()
})

const handleCardClick = (profileId: string) => {
  router.push({
    name: 'PublicProfile',
    params: {
      id: profileId,
    },
  })
}

const handlePrefsClick = () => {
  showModal.value = true
}

const updateDatingPrefs = async () => {
  await profileBrowserStore.persistDatingPrefs()
}
</script>

<template>
  <main class="container">
    <ErrorOverlay v-if="error" :error />

    <div v-else class="mt-5">
      <div class="px-4">
        <SecondaryNav
          v-if="profileBrowserStore.datingPrefs && profileStore.profile"
          v-model="profileBrowserStore.datingPrefs"
          :profile="profileStore.profile"
        />
      </div>

      <div v-if="haveProfiles" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
        <div v-for="profile in profileBrowserStore.profileList" :key="profile.id" class="col">
          <ProfileCardComponent :profile @click="handleCardClick(profile.id)" />
        </div>
      </div>
      <BModal
        v-else
        centered
        :no-footer="true"
        :no-header="true"
        :backdrop-first="false"
        no-animation
        title="Help spread the word!"
      >
        <InvitePeopleDialog />
      </BModal>
    </div>
  </main>
</template>
