<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import ProfileBrowseLayout from '../components/ProfileBrowseLayout.vue'
import ProfileCardGrid from '../components/ProfileCardGrid.vue'
import DatingPrefsDisplay from '../components/DatingPrefsDisplay.vue'
import DatingPreferencesForm from '../components/DatingPreferencesForm.vue'
import LikesAndMatchesBanner from '@/features/interaction/components/LikesAndMatchesBanner.vue'
import MatchesList from '@/features/interaction/components/MatchesList.vue'
import FluidColumn from '@/features/shared/ui/FluidColumn.vue'

import { useDatingMatchViewModel } from '../composables/useDatingMatchViewModel'

const {
  viewerProfile,
  haveAccess,
  haveResults,
  isLoading,
  isLoadingMore,
  hasMoreProfiles,
  profileList,
  selectedProfileId,
  datingPrefs,
  isInitialized,
  hideProfile,
  updatePrefs,
  openProfile,
  closeProfile,
  initialize,
  reset,
  loadMoreProfiles,
  matches,
  haveMatches,
  haveReceivedLikes,
  haveSentLikes,
  receivedLikesCount,
} = useDatingMatchViewModel()

onMounted(async () => {
  await initialize()
})

onUnmounted(() => {
  reset()
})
</script>

<template>
  <ProfileBrowseLayout
    :viewerProfile="viewerProfile"
    :profileList="profileList"
    :selectedProfileId="selectedProfileId"
    :isLoading="isLoading"
    :isLoadingMore="isLoadingMore"
    :isInitialized="isInitialized"
    :hasMoreProfiles="hasMoreProfiles"
    :haveAccess="haveAccess"
    :haveResults="haveResults"
    currentScope="dating"
    @load-more="loadMoreProfiles"
    @profile:open="openProfile"
    @profile:close="closeProfile"
    @profile:hidden="hideProfile"
    @prefs:update="updatePrefs"
  >
    <template #filter-bar>
      <div class="filter-area flex-grow-1">
        <DatingPrefsDisplay
          v-if="datingPrefs && haveAccess"
          v-model="datingPrefs"
        />
      </div>
    </template>

    <template #results="{ onProfileSelect }">
      <FluidColumn class="grid-view">
        <LikesAndMatchesBanner class="mb-3" />

        <template v-if="haveMatches">
          <p class="px-2">{{ $t('matches.matches_list_title') }}</p>
          <div class="px-2 mb-3">
            <MatchesList
              :edges="matches"
              @select:profile="onProfileSelect"
            />
          </div>
        </template>

        <ProfileCardGrid
          :profiles="profileList"
          :showTags="false"
          :showLocation="false"
          @profile:select="onProfileSelect"
        />
      </FluidColumn>
    </template>

    <template #prefs-modal>
      <DatingPreferencesForm
        v-model="datingPrefs"
        v-if="datingPrefs"
      />
    </template>
  </ProfileBrowseLayout>
</template>
