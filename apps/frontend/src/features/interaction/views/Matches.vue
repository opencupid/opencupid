<script setup lang="ts">
import { onMounted } from 'vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import MatchesList from '../components/MatchesList.vue'
import IconDate from '@/assets/icons/app/cupid.svg'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'
import PlaceholdersGrid from '@/features/findProfile/components/PlaceholdersGrid.vue'
import ProfileChipListPlaceholder from '@/features/publicprofile/components/ProfileChipListPlaceholder.vue'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'
import ReceivedLikesCount from '../components/ReceivedLikesCount.vue'

const {
  matches,
  haveMatches,
  haveReceivedLikes,
  haveSentLikes,
  receivedLikesCount,
  isLoading,
  initialize,
} = useInteractionsViewModel()

onMounted(async () => {
  await initialize()
})
</script>

<template>
  <main class="container mt-3 pt-5 dating overflow-auto">
    <ViewTitle :icon="IconDate" title="" class="text-dating" />
    <MiddleColumn>
      <div class="d-flex flex-column align-items-center justify-content-center text-center">
        <BPlaceholderWrapper :loading="isLoading">
          <template #loading>
            <BCol cols="6">
              <ProfileChipListPlaceholder :howMany="4" :isAnimated="true" />
            </BCol>
          </template>

          <!-- have inbound likes but no matches -->
          <template v-if="haveReceivedLikes && !haveMatches">
            <div class="mb-3">
              {{ $t('matches.received_likes', { count: receivedLikesCount }) }}
            </div>

            <BButton
              v-if="haveReceivedLikes"
              variant="primary"
              @click="
                $router.push({
                  name: 'BrowseProfiles',
                  params: { scope: 'dating' },
                })
              "
            >
              {{ $t('matches.received_likes_cta', { count: receivedLikesCount }) }}
            </BButton>
          </template>

          <!-- no matches and haven't sent any likes -->
          <template v-else-if="!haveMatches && !haveSentLikes">
            <p>
              {{ $t('matches.no_match_no_sent_like') }}
            </p>
            <BButton
              variant="primary"
              @click="
                $router.push({
                  name: 'BrowseProfiles',
                  params: { scope: 'dating' },
                })
              "
            >
              {{ $t('matches.no_match_no_sent_like_cta') }}
            </BButton>
          </template>

          <!-- no matches but have sent likes -->
          <template v-else-if="!haveMatches && haveSentLikes">
            <p>
              {{ $t('matches.no_match_have_sent_like') }}
            </p>
            <BButton
              variant="primary"
              @click="
                $router.push({
                  name: 'BrowseProfiles',
                  params: { scope: 'dating' },
                })
              "
            >
              {{ $t('matches.no_match_have_sent_like_cta') }}
            </BButton>
          </template>

          <!-- got matches -->
          <template v-else-if="haveMatches">
            <p>My matches</p>
            <div class="w-100 px-5">
              <MatchesList
                :edges="matches"
                @select:profile="
                  profileId => $router.push({ name: 'PublicProfile', params: { profileId } })
                "
              />
            </div>
          </template>
          <template v-else>
            <!-- any condition not covered above (this should be dead code)-->
            <ProfileChipListPlaceholder :howMany="4" :isAnimated="false" />
          </template>
        </BPlaceholderWrapper>
      </div>
    </MiddleColumn>
  </main>
</template>
