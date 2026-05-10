<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMyProfileRouteState } from '@/features/myprofile/composables/useMyProfileRouteState'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { LocationSchema } from '@zod/dto/location.dto'
import type { OwnerPost } from '@zod/post/post.dto'
import type { OwnerEvent } from '@zod/event/event.dto'
import FloatingButton from '@/features/shared/components/FloatingButton.vue'
import MyPostList from './MyPostList.vue'
import EditPostDialog from './EditPostDialog.vue'
import EditEventDialog from '@/features/events/components/EditEventDialog.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare, faCalendarPlus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { usePostStore } from '../stores/postStore'

const { t } = useI18n()

defineOptions({ name: 'PostsOrchestrator' })

const router = useRouter()
const { subView, editingPostId, editingEventId } = useMyProfileRouteState()
const { formData } = useMyProfileViewModel(false)

const editingPost = ref<OwnerPost | undefined>()
const editingEvent = ref<OwnerEvent | undefined>()
const defaultLocation = computed(() => LocationSchema.parse(formData?.location ?? {}))

const postStore = usePostStore()

// Guard against deep-linking to an edit route without a loaded post
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

// Same deep-link guard for events
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

function openEditPost(post: OwnerPost) {
  editingPost.value = post
  router.push({ name: 'MeEditPost', params: { postId: post.id } })
}

function openCreatePost() {
  editingPost.value = undefined
  router.push({ name: 'MeCreatePost' })
}

function openCreateEvent() {
  router.push({ name: 'MeCreateEvent' })
}

async function handleDelete(post: OwnerPost) {
  if (!post || !confirm(t('posts.messages.confirm_delete'))) {
    return
  }

  await postStore.deletePost(post.id)
}

async function handleHide(post: OwnerPost) {
  if (!post) {
    return
  }

  const isVisible = 'isVisible' in post ? post.isVisible !== false : true
  if (isVisible) {
    await postStore.hidePost(post.id)
  } else {
    await postStore.showPost(post.id)
  }
}
</script>

<template>
  <template v-if="subView === 'myposts'">
    <MyPostList
      scope="my"
      @intent:edit="openEditPost"
      @intent:delete="handleDelete"
      @intent:hide="handleHide"
    />

    <FloatingButton speed-dial>
      <BButton
        size="lg"
        class="btn-icon-lg btn-shadow"
        variant="primary"
        :title="$t('posts.actions.create_cta_title')"
      >
        <FontAwesomeIcon :icon="faPlus" />
      </BButton>
      <template #actions>
        <BButton
          size="lg"
          class="btn-icon-lg btn-shadow"
          variant="outline-primary"
          :title="$t('posts.actions.create_advert_cta_title')"
          @click="openCreatePost"
        >
          <FontAwesomeIcon :icon="faPenToSquare" />
        </BButton>
        <BButton
          size="lg"
          class="btn-icon-lg btn-shadow"
          variant="outline-primary"
          :title="$t('posts.actions.create_event_cta_title')"
          @click="openCreateEvent"
        >
          <FontAwesomeIcon :icon="faCalendarPlus" />
        </BButton>
      </template>
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
</template>
