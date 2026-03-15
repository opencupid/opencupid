<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import PostEdit from '../components/PostEdit.vue'
import { usePostStore } from '../stores/postStore'
import type { OwnerPost } from '@zod/post/post.dto'

defineOptions({ name: 'EditPost' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const postStore = usePostStore()

const postId = computed(() => route.params.postId as string | undefined)
const isEdit = computed(() => !!postId.value)
const post = ref<OwnerPost>()
const isLoading = ref(false)

const title = computed(() => (isEdit.value ? t('posts.edit_title') : t('posts.create_title')))

onMounted(async () => {
  if (!postId.value) return

  const cached = postStore.getPostById(postId.value)
  if (cached) {
    post.value = cached as OwnerPost
    return
  }

  isLoading.value = true
  const fetched = await postStore.fetchPost(postId.value)
  if (fetched) {
    post.value = fetched as OwnerPost
  }
  isLoading.value = false
})

function handleCancel() {
  router.back()
}

function handleSaved(savedPost: OwnerPost) {
  const idx = postStore.myPosts.findIndex((p) => p.id === savedPost.id)
  if (idx === -1) {
    postStore.myPosts.unshift(savedPost)
  } else {
    postStore.myPosts[idx] = savedPost
  }
  router.push({ name: 'Posts' })
}
</script>

<template>
  <div
    class="container py-3"
    style="max-width: 640px"
  >
    <h5 class="mb-3">{{ title }}</h5>

    <div
      v-if="isLoading"
      class="text-center py-5"
    >
      <BSpinner />
    </div>

    <PostEdit
      v-else
      :post="post"
      :is-edit="isEdit"
      @cancel="handleCancel"
      @saved="handleSaved"
    />
  </div>
</template>
