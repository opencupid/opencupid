<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMyProfileRouteState } from '@/features/myprofile/composables/useMyProfileRouteState'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { LocationSchema } from '@zod/dto/location.dto'
import type { OwnerPost } from '@zod/post/post.dto'
import type { OwnerEvent } from '@zod/event/event.dto'
import type { OwnerCommunity } from '@zod/community/community.dto'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import FloatingButton from '@/features/shared/components/FloatingButton.vue'
import MyContentList from '@/features/userContent/components/MyContentList.vue'
import UserContentCreateSpeedDial from '@/features/userContent/components/UserContentCreateSpeedDial.vue'
import EditPostDialog from './EditPostDialog.vue'
import EditEventDialog from '@/features/events/components/EditEventDialog.vue'
import EditCommunityDialog from '@/features/community/components/EditCommunityDialog.vue'
import { useI18n } from 'vue-i18n'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'

const { t } = useI18n()

defineOptions({ name: 'PostsOrchestrator' })

const router = useRouter()
const { subView, editingPostId, editingEventId, editingCommunityId } = useMyProfileRouteState()
const { formData } = useMyProfileViewModel(false)

const editingPost = ref<OwnerPost | undefined>()
const editingEvent = ref<OwnerEvent | undefined>()
const editingCommunity = ref<OwnerCommunity | undefined>()
const defaultLocation = computed(() => LocationSchema.parse(formData?.location ?? {}))

const contentStore = useUserContentStore()

watch(
  editingPostId,
  (postId) => {
    if (postId && !editingPost.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!postId) {
      editingPost.value = undefined
    }
  },
  { immediate: true }
)

watch(
  editingEventId,
  (eventId) => {
    if (eventId && !editingEvent.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!eventId) {
      editingEvent.value = undefined
    }
  },
  { immediate: true }
)

watch(
  editingCommunityId,
  (communityId) => {
    if (communityId && !editingCommunity.value) {
      router.replace({ name: 'MePosts' })
    }
    if (!communityId) {
      editingCommunity.value = undefined
    }
  },
  { immediate: true }
)

function openCreatePost() {
  editingPost.value = undefined
  router.push({ name: 'MeCreatePost' })
}

function openCreateEvent() {
  editingEvent.value = undefined
  router.push({ name: 'MeCreateEvent' })
}

function openCreateCommunity() {
  editingCommunity.value = undefined
  router.push({ name: 'MeCreateCommunity' })
}

function handleEdit(item: OwnerUserContent) {
  switch (item.kind) {
    case 'post':
      editingPost.value = item
      router.push({ name: 'MeEditPost', params: { postId: item.id } })
      break
    case 'event':
      editingEvent.value = item
      router.push({ name: 'MeEditEvent', params: { eventId: item.id } })
      break
    case 'community':
      editingCommunity.value = item
      router.push({ name: 'MeEditCommunity', params: { communityId: item.id } })
      break
  }
}

async function handleDelete(item: OwnerUserContent) {
  if (!confirm(t('posts.messages.confirm_delete'))) return
  switch (item.kind) {
    case 'post':
      await contentStore.deletePost(item.id)
      break
    case 'event':
      await contentStore.deleteEvent(item.id)
      break
    case 'community':
      await contentStore.deleteCommunity(item.id)
      break
  }
}

async function handleHide(item: OwnerUserContent) {
  const isVisible = item.isVisible !== false
  switch (item.kind) {
    case 'post':
      if (isVisible) await contentStore.hidePost(item.id)
      else await contentStore.showPost(item.id)
      break
    case 'event':
      await contentStore.updateEvent(item.id, { isVisible: !isVisible })
      break
    case 'community':
      await contentStore.updateCommunity(item.id, { isVisible: !isVisible })
      break
  }
}
</script>

<template>
  <template v-if="subView === 'myposts'">
    <MyContentList
      @intent:edit="handleEdit"
      @intent:delete="handleDelete"
      @intent:hide="handleHide"
    />

    <FloatingButton>
      <UserContentCreateSpeedDial
        @create:post="openCreatePost"
        @create:event="openCreateEvent"
        @create:community="openCreateCommunity"
      />
    </FloatingButton>
  </template>
  <EditPostDialog
    v-else-if="subView === 'editpost'"
    :post="editingPost"
    :is-edit="!!editingPost"
    :default-location="defaultLocation"
    @cancel="router.replace({ name: 'MePosts' })"
    @saved="router.replace({ name: 'MePosts' })"
  />
  <EditEventDialog
    v-else-if="subView === 'editevent'"
    :event="editingEvent"
    :is-edit="!!editingEvent"
    :default-location="defaultLocation"
    @cancel="router.replace({ name: 'MePosts' })"
    @saved="router.replace({ name: 'MePosts' })"
  />
  <EditCommunityDialog
    v-else-if="subView === 'editcommunity'"
    :community="editingCommunity"
    :is-edit="!!editingCommunity"
    :default-location="defaultLocation"
    @cancel="router.replace({ name: 'MePosts' })"
    @saved="router.replace({ name: 'MePosts' })"
  />
</template>
