<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMyProfileRouteState } from '@/features/myprofile/composables/useMyProfileRouteState'
import { useMyProfileViewModel } from '@/features/myprofile/composables/useMyProfileViewModel'
import { LocationSchema } from '@zod/dto/location.dto'
import type { OwnerPost } from '@zod/post/post.dto'
import FloatingButton from '@/features/shared/components/FloatingButton.vue'
import MyPostList from './MyPostList.vue'
import EditPostDialog from './EditPostDialog.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { usePostStore } from '../stores/postStore'

const { t } = useI18n()

defineOptions({ name: 'PostsOrchestrator' })

const router = useRouter()
const { subView, editingPostId } = useMyProfileRouteState()
const { formData } = useMyProfileViewModel(false)

const editingPost = ref<OwnerPost | undefined>()
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

function openEditPost(post: OwnerPost) {
  editingPost.value = post
  router.push({ name: 'MeEditPost', params: { postId: post.id } })
}

function openCreatePost() {
  editingPost.value = undefined
  router.push({ name: 'MeCreatePost' })
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

    <FloatingButton>
      <BButton
        size="lg"
        class="btn-icon-lg btn-shadow"
        variant="primary"
        :title="$t('posts.actions.create_cta_title')"
        @click="openCreatePost"
      >
        <FontAwesomeIcon :icon="faPenToSquare" />
      </BButton>
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
</template>
