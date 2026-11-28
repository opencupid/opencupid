<script setup lang="ts">
// Shown in place of the message list while a conversation has no messages:
// what the two members already share — a match or a smile — and the
// partner's interests, as something to start talking about. Outside a match
// the first message waits for a reply before more can be sent (a match opens
// the conversation as accepted), so the starter explains that limit.
import type { InteractionContext } from '@zod/interaction/interactionContext.dto'
import type { OwnerProfile, PublicProfile } from '@zod/profile/profile.dto'

import MatchPair from '@/features/interaction/components/MatchPair.vue'
import RevealedLikeCard from '@/features/interaction/components/RevealedLikeCard.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'

defineProps<{
  partner: PublicProfile
  viewer: OwnerProfile | null
  context: InteractionContext | undefined
}>()
</script>

<template>
  <div
    class="conversation-starter h-100 overflow-auto d-flex flex-column align-items-center gap-5 px-3 py-5"
  >
    <div
      v-if="context?.isMatch && viewer"
      data-testid="starter-match"
      class="d-flex flex-column align-items-center gap-3"
    >
      <MatchPair
        :left="viewer"
        :right="partner"
      />
      <div class="text-dating text-center">
        {{ $t('interactions.you_smiled_at_each_other', { name: partner.publicName }) }}
      </div>
    </div>
    <div
      v-else-if="context?.likedByMe || context?.likedMeRevealed"
      data-testid="starter-like"
      class="d-flex flex-column align-items-center gap-2"
    >
      <div class="like-card dating p-2">
        <RevealedLikeCard :profile="partner" />
      </div>
      <div class="text-dating text-center">
        {{
          context.likedByMe
            ? $t('interactions.you_smiled_at', { name: partner.publicName })
            : $t('interactions.name_smiled_at_you', { name: partner.publicName })
        }}
      </div>
    </div>

    <div
      v-if="partner.tags.length"
      data-testid="starter-tags"
      class="w-100 text-center"
    >
      <h6 class="mb-3">
        {{ $t('messaging.partner_interests', { name: partner.publicName }) }}
      </h6>
      <TagList
        class="justify-content-center row-gap-2"
        :tags="partner.tags"
      />
    </div>

    <p
      v-if="!context?.isMatch"
      data-testid="starter-first-message"
      class="text-muted text-center small mb-0"
    >
      {{ $t('messaging.first_message_rule', { name: partner.publicName }) }}
    </p>
  </div>
</template>

<style scoped>
.like-card {
  width: 6rem;
  border-radius: var(--bs-border-radius-lg);
}
</style>
