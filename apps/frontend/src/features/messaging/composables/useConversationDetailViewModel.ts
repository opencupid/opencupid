import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type {
  ConversationDraftSummary,
  ConversationOrDraft,
  ConversationSummary,
} from '@zod/messaging/messaging.dto'
import type { PublicProfile } from '@zod/profile/profile.dto'

import { useMessageStore } from '../stores/messageStore'
import { usePublicProfileStore } from '@/features/publicprofile/stores/publicProfileStore'
import { useCallStore } from '@/features/videocall/stores/callStore'
import * as callsApi from '@/features/videocall/api/calls.api'
import { useInboxRouteState } from './useInboxRouteState'

// View model for the conversation-detail screen. Owns route → data resolution
// (existing summary by id, or draft summary by partner profileId), the partner
// PublicProfile fetch used by the header, the side-effect handlers that used
// to live in ConversationDetail.vue, and the draft → persisted route swap that
// happens after the first message in a draft conversation is sent.
//
// ConversationDetail.vue is a pure renderer over what this composable returns.
// The store stays strictly typed to persisted ConversationSummary — drafts are
// held locally here.
export function useConversationDetailViewModel() {
  const router = useRouter()
  const messageStore = useMessageStore()
  const profileStore = usePublicProfileStore()
  const callStore = useCallStore()
  const { mode, conversationId, partnerProfileId } = useInboxRouteState()

  // Local-only — drafts never enter messageStore (which is persisted-only).
  const draftSummary = ref<ConversationDraftSummary | null>(null)
  const conversationPartner = ref<PublicProfile | null>(null)

  const conversation = computed<ConversationOrDraft | null>(() => {
    if (mode.value === 'draft') return draftSummary.value
    return messageStore.activeConversation
  })

  const isDraft = computed(() => conversation.value?.isDraft === true)

  const persistedConversation = computed<ConversationSummary | null>(() => {
    const c = conversation.value
    return c && c.isDraft === false ? c : null
  })

  const canCall = computed(() => {
    const c = persistedConversation.value
    if (!c) return false
    return c.canReply && c.isCallable
  })

  const myIsCallable = computed(() => persistedConversation.value?.myIsCallable ?? true)

  // Route-driven resolution. Detail mode loads an existing conversation by id;
  // draft mode resolves by partner profileId without writing anything.
  watch(
    [mode, conversationId, partnerProfileId],
    async ([m, convoId, profileId]) => {
      if (m === 'detail' && convoId) {
        draftSummary.value = null
        await messageStore.setActiveConversationById(convoId)
        setTimeout(() => messageStore.markAsRead(convoId), 2000)
      } else if (m === 'draft' && profileId) {
        messageStore.resetActiveConversation()
        const res = await messageStore.resolveConversationByProfile(profileId)
        if (!res.success || !res.data) {
          draftSummary.value = null
          return
        }
        if (res.data.isDraft) {
          draftSummary.value = res.data
        } else {
          // Server already had a persisted conversation — swap to canonical URL
          // so refresh / share-link behavior matches the detail route.
          draftSummary.value = null
          await messageStore.setActiveConversation(res.data)
          router.replace({
            name: 'Conversation',
            params: { conversationId: res.data.conversationId },
          })
        }
      }
    },
    { immediate: true }
  )

  // Cleanup must run synchronously during unmount: when the route changes
  // back to /inbox, <ConversationDetail> is torn down by v-else-if before
  // any watcher gets a chance to flush, so a watch-based reset would never
  // fire. onBeforeUnmount runs as part of the unmount itself.
  onBeforeUnmount(() => {
    draftSummary.value = null
    messageStore.resetActiveConversation()
  })

  // Partner PublicProfile drives the header (avatar, name, callable toggle).
  // Fetched whenever the conversation we're viewing changes partner identity.
  watch(
    () => conversation.value?.partnerProfile?.id ?? null,
    async (partnerId) => {
      if (!partnerId) {
        conversationPartner.value = null
        return
      }
      const res = await profileStore.getPublicProfile(partnerId)
      conversationPartner.value = res.success ? (res.data ?? null) : null
    },
    { immediate: true }
  )

  // First message in a draft persists the conversation server-side. The send
  // response goes through messageStore.handleSendResponse → bumpConversation,
  // which adds the now-persisted summary to the inbox list. We pick it up here
  // and swap the route to the canonical /inbox/:conversationId form.
  async function onMessageSent() {
    if (!isDraft.value) return
    const partnerId = draftSummary.value?.partnerProfile.id
    if (!partnerId) return
    const persisted = messageStore.conversations.find((c) => c.partnerProfile.id === partnerId)
    if (!persisted) return
    draftSummary.value = null
    await messageStore.setActiveConversation(persisted)
    router.replace({
      name: 'Conversation',
      params: { conversationId: persisted.conversationId },
    })
  }

  async function blockProfile(): Promise<boolean> {
    if (!conversationPartner.value) return false
    const res = await profileStore.blockProfile(conversationPartner.value.id)
    return res.success
  }

  function startCall() {
    const c = persistedConversation.value
    if (!c) return
    callStore.initiateCall(c.conversationId)
  }

  async function toggleCallable(event: Event) {
    const c = persistedConversation.value
    if (!c) return
    const checkbox = event.target as HTMLInputElement
    const isCallable = checkbox.checked
    try {
      await callsApi.updateCallable(c.conversationId, isCallable)
    } catch {
      checkbox.checked = !isCallable
    }
  }

  function deselect() {
    router.push({ name: 'Inbox' })
  }

  return {
    conversation,
    persistedConversation,
    partner: conversationPartner,
    isDraft,
    isLoading: computed(() => messageStore.isLoading),
    canCall,
    myIsCallable,
    profileStoreLoading: computed(() => profileStore.isLoading),
    onMessageSent,
    blockProfile,
    startCall,
    toggleCallable,
    deselect,
  }
}
