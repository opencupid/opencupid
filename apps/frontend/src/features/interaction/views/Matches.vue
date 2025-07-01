<script setup lang="ts">
import { onMounted } from 'vue'
import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import MatchesList from '../components/MatchesList.vue'
import IconDate from '@/assets/icons/app/cupid.svg'
import ViewTitle from '@/features/shared/ui/ViewTitle.vue'
import ProfileChipListPlaceholder from '@/features/publicprofile/components/ProfileChipListPlaceholder.vue'
import { useInteractionsViewModel } from '../composables/useInteractionsViewModel'

const { matches, haveMatches, isLoading, refreshInteractions } = useInteractionsViewModel()

onMounted(async () => {
  await refreshInteractions()
})
</script>

<template>
  <main class="container mt-3 pt-5 dating">
    <ViewTitle :icon="IconDate" title="My matches" class="text-dating"/>
    <MiddleColumn>
      <div class="d-flex flex-column align-items-center justify-content-center">
        <BPlaceholderWrapper :loading="isLoading">
          <template #loading>
            <div class="col-10 col-md-6 mb-3">
              <ProfileChipListPlaceholder :isAnimated="true" :howMany="5" />
            </div>
          </template>

          <div class="col-10 col-md-6 mb-3">
            <MatchesList
              v-if="haveMatches"
              :edges="matches"
              @select:profile="
                profileId => $router.push({ name: 'PublicProfile', params: { profileId } })
              "
            />
            <div v-else>
              <p class="text-muted text-center">You have no matches yet.</p>
              <div class="text-center mb-3">
                <BButton
                  variant="primary"
                  @click="
                    $router.push({
                      name: 'BrowseProfiles',
                      params: { scope: 'dating' },
                    })
                  "
                >
                  Find people
                </BButton>
              </div>
              <div class="mb-3">
                <ProfileChipListPlaceholder :howMany="4" />
              </div>
            </div>
          </div>
        </BPlaceholderWrapper>
      </div>
    </MiddleColumn>
  </main>
</template>
