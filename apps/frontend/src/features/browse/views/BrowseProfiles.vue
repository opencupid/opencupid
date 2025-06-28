<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, ref, watch } from 'vue'
import { useProfileStore } from '@/store/profileStore'

import { useFindMatchViewModel } from '@/features/browse/composables/useFindMatchViewModel'

import ErrorOverlay from '@/features/shared/ui/StoreErrorOverlay.vue'
import DatingPreferencesForm from '@/features/browse/components/DatingPreferencesForm.vue'
import SecondaryNav from '@/features/browse/components/SecondaryNav.vue'
import ProfileCardGrid from '@/features/browse/components/ProfileCardGrid.vue'
import NoAccessCTA from '@/features/browse/components/NoAccessCTA.vue'
import NoResultsCTA from '@/features/browse/components/NoResultsCTA.vue'
import PlaceholdersGrid from '@/features/browse/components/PlaceholdersGrid.vue'
import { type ProfileScope, ProfileScopeSchema } from '@zod/profile/profile.dto'

const router = useRouter()
const profileStore = useProfileStore()

const props = defineProps<{
  scope?: string
}>()
// state management
const showModal = ref(false)

const {  me, haveAccess, haveResults, isLoading, findProfilesStore, error, initialize } =
  useFindMatchViewModel()

onMounted(async () => {
  const params = ProfileScopeSchema.safeParse(props.scope)
  let defaultScope
  if (params.success) {
    defaultScope = params.data
  }
  await initialize(defaultScope)
})

watch(
  () => findProfilesStore.currentScope,
  (newScope: ProfileScope | null) => {
    if (newScope) {
      router.replace({
        name: 'BrowseProfilesScope',
        params: {
          scope: newScope,
        },
      })
    }
  }
)
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

const handleEditProfileIntent = () => {
  router.push({ name: 'EditProfile' })
}
</script>

<template>
  <main class="container h-100">
    <ErrorOverlay v-if="error" :error />

    <div v-else class="mt-2 h-100 overflow-hidden position-relative d-flex flex-column">
      <div class="mb-2">
        <SecondaryNav
          v-model="findProfilesStore.currentScope"
          @edit:datingPrefs="showModal = true"
          @scope:change="findProfilesStore.setCurrentScope($event)"
          :prefs-button-disabled="!haveAccess"
        />
      </div>
      <BPlaceholderWrapper :loading="!haveResults">
        <template #loading>
          <BOverlay
            show
            no-spinner
            no-center
            bg-color="var(--bs-body-bg)"
            :blur="null"
            opacity="0.85"
            class="h-100 overlay"
            spinner-variant="primary"
            spinner-type="grow"
          >
            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-2 g-4 my-0 overflow-hidden">
              <PlaceholdersGrid :howMany="6" :loading="isLoading" />
            </div>
            <template #overlay>
              <div
                v-if="!isLoading"
                class="h-100 w-100 d-flex flex-column align-items-center justify-content-center p-2"
              >
                <NoAccessCTA
                  v-if="!haveAccess"
                  v-model="findProfilesStore.currentScope"
                  @edit:profile="handleEditProfileIntent"
                />
                <NoResultsCTA v-else-if="!haveResults" />
              </div>
            </template>
          </BOverlay>
        </template>

        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-2 g-4 my-0 overflow-auto h-100">
          <ProfileCardGrid
            :profiles="findProfilesStore.profileList"
            @profile:select="handleCardClick"
          />
        </div>
      </BPlaceholderWrapper>

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
        <DatingPreferencesForm
          v-model="findProfilesStore.datingPrefs"
          v-if="findProfilesStore.datingPrefs"
        />
      </BModal>
    </div>
  </main>
</template>

<style scoped>
</style>
