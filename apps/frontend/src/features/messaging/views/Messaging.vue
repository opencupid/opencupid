<script lang="ts" setup>
import { onMounted, toRef } from 'vue'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconSearch from '@/assets/icons/interface/search.svg'

import ConversationDetail from '../components/ConversationDetail.vue'
import ConversationSummaries from '../components/ConversationSummaries.vue'
import ViewTitle from '../../shared/ui/ViewTitle.vue'
import LikesAndMatchesBanner from '@/features/interaction/components/LikesAndMatchesBanner.vue'
import MatchesList from '@/features/interaction/components/MatchesList.vue'

import { useMessagingViewModel } from '../composables/useMessagingViewModel'

defineOptions({ name: 'Messaging' })

const props = defineProps<{
  conversationId?: string
}>()

const {
  conversations,
  activeConversation,
  isLoading,
  haveConversations,
  isDetailView,
  isInitialized,
  handleSelectConvo,
  handleDeselectConvo,
  handleProfileSelect,
  fetchConversations,
  initialize,
  matches,
  haveMatches,
} = useMessagingViewModel(toRef(props, 'conversationId'))

onMounted(async () => {
  await initialize()
})
</script>

<template>
  <main class="w-100 position-relative">
    <!-- Detail view overlay -->
    <div
      v-if="isInitialized && isDetailView"
      class="detail-view position-absolute w-100"
      style="z-index: 1050"
    >
      <MiddleColumn class="h-100">
        <ConversationDetail
          :loading="isLoading"
          :conversation="activeConversation"
          @deselect:convo="handleDeselectConvo"
          @profile:select="handleProfileSelect"
          @updated="fetchConversations"
        />
      </MiddleColumn>
    </div>

    <!-- List view -->
    <div
      class="d-flex flex-column overflow-auto hide-scrollbar h-100"
      :class="{ 'd-none': isDetailView }"
    >
      <ViewTitle
        :icon="IconMessage"
        class="text-primary"
      >
        {{ $t('messaging.page_title') }}
      </ViewTitle>
      <BOverlay
        :show="!haveConversations && isInitialized"
        no-spinner
        bg-color="inherit"
        :blur="null"
        opacity="0.85"
        class="h-100 overlay"
      >
        <template #overlay>
          <div class="d-flex flex-column align-items-center justify-content-center h-100">
            <p class="text-muted mb-4 mt-4 text-center">
              {{ $t('messaging.no_messages_placeholder') }}
            </p>
            <BButton
              variant="primary"
              size="lg"
              pill
              @click="$router.push({ name: 'SocialMatch' })"
            >
              <IconSearch class="svg-icon" />
              {{ $t('messaging.no_messages_cta') }}
            </BButton>
          </div>
        </template>

        <!-- Conversation summaries -->
        <div class="flex-grow-1 overflow-auto hide-scrollbar pt-5">
          <MiddleColumn>
            <LikesAndMatchesBanner class="mb-3" />

            <template v-if="haveMatches">
              <p class="px-2">{{ $t('matches.matches_list_title') }}</p>
              <div class="px-2 mb-3">
                <MatchesList
                  :edges="matches"
                  @select:profile="handleProfileSelect"
                />
              </div>
            </template>

            <ConversationSummaries
              :loading="isLoading"
              :conversations="conversations"
              :activeConversation="activeConversation"
              @convo:select="handleSelectConvo"
            />
          </MiddleColumn>
        </div>
      </BOverlay>
    </div>
  </main>
</template>
<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';

.detail-view {
  left: 0;
  // nav.fixed is on 1030 - on screens < md we put this above the navbar

  // on screens > sm navbar stays visible
  // top: $navbar-height;
  // height: calc(100vh - $navbar-height);
  inset: 0;
  height: 100dvh;
  z-index: 1050;

  @include media-breakpoint-up(sm) {
    // on screens > sm navbar stays visible
    top: $navbar-height;
    height: calc(100vh - $navbar-height);
    z-index: 900;
  }
}

.inactive {
  pointer-events: none;
  visibility: hidden;
  display: none;
}
main {
  width: 100%;
}
</style>
