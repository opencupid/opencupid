<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { useProfileStore } from '@/store/profileStore'


import InvitePeopleDialog from '@/components/profiles/public/InvitePeopleDialog.vue'
import ErrorOverlay from '@/components/ErrorOverlay.vue'
import DatingPreferencesForm from '@/components/profiles/match/DatingPreferencesForm.vue'
import SecondaryNav from '@/components/profiles/match/SecondaryNav.vue'
import ProfileCardGrid from '../components/profiles/match/ProfileCardGrid.vue'
import { useFindMatchViewModel } from '@/components/profiles/match/useFindMatchViewModel'

const router = useRouter()
const profileStore = useProfileStore()

// state management
const showModal = ref(false)
const showPrefs = ref(false)

const { vm, me, findProfilesStore, haveResults, error, initialize } = useFindMatchViewModel()

onMounted(async () => {
  await initialize()
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
  await findProfilesStore.persistDatingPrefs()
}
</script>

<template>
  <main class="container">
    <ErrorOverlay v-if="error" :error />

    <div v-else class="mt-2">
      <SecondaryNav v-model="vm" @edit:datingPrefs="showModal = true" />

      <div v-if="haveResults" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
        <ProfileCardGrid
          :profiles="findProfilesStore.profileList"
          @profile:select="handleCardClick"
        />
      </div>

      <InvitePeopleDialog v-else />

      <BModal
        v-model="showModal"
        centered
        button-size="sm"
        :focus="false"
        :no-close-on-backdrop="true"
        fullscreen="sm"
        :no-footer="false"
        :no-header="true"
        cancel-title="Nevermind"
        initial-animation
        :body-scrolling="false"
        title="Add a photo"
        @ok="updateDatingPrefs"
      >
        <DatingPreferencesForm v-model="findProfilesStore.datingPrefs" v-if="findProfilesStore.datingPrefs" />
      </BModal>
    </div>
  </main>
</template>
