import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  PublicPostWithProfile,
  OwnerPost,
} from '@zod/post/post.dto'
import { type PostTypeType } from '@zod/generated'

import { usePostStore } from '../stores/postStore'

interface UsePostListOptions {
  scope?: 'all' | 'nearby' | 'recent' | 'my'
  type?: PostTypeType
  nearbyParams?: { lat: number; lon: number; radius: number }
}

export function usePostListViewModel(options: UsePostListOptions) {
  const postStore = usePostStore()
  const { t } = useI18n()

  const selectedType = ref<string>(options.type || '')
  const currentPage = ref(0)
  const pageSize = 20

  const showFullView = ref(false)
  const showEditModal = ref(false)
  const selectedPost = ref<PublicPostWithProfile | OwnerPost | null>(null)
  const editingPost = ref<OwnerPost | null>(null)

  const posts = computed(() => {
    return options.scope === 'my' ? postStore.myPosts : postStore.posts
  })

  const canLoadMore = computed(() => {
    return posts.value.length >= (currentPage.value + 1) * pageSize
  })

  const loadPosts = async (append = false) => {
    if (!append) {
      currentPage.value = 0
    }
    await postStore.loadPosts(options.scope || 'all', {
      type: (selectedType.value as PostTypeType) || undefined,
      page: currentPage.value,
      pageSize,
      nearbyParams: options.nearbyParams,
    })
  }

  const handleTypeFilter = () => {
    loadPosts()
  }

  const handleLoadMore = () => {
    currentPage.value++
    loadPosts(true)
  }

  const handleRetry = () => {
    postStore.clearError()
    loadPosts()
  }

  const handlePostClick = (post: PublicPostWithProfile | OwnerPost) => {
    selectedPost.value = post
    showFullView.value = true
  }

  const handlePostEdit = (post: PublicPostWithProfile | OwnerPost) => {
    editingPost.value = post as OwnerPost
    showEditModal.value = true
  }

  const handlePostDelete = async (post: PublicPostWithProfile | OwnerPost) => {
    if (confirm(t('posts.confirm_delete'))) {
      const success = await postStore.deletePost(post.id)
      if (success) {
        closeFullView()
      }
    }
  }

  const handlePostSaved = (post: OwnerPost) => {
    closeEditModal()
    loadPosts()
  }

  const closeFullView = () => {
    showFullView.value = false
    selectedPost.value = null
  }

  const closeEditModal = () => {
    showEditModal.value = false
    editingPost.value = null
  }

  watch(
    () => options.type,
    newType => {
      selectedType.value = newType || ''
      loadPosts()
    }
  )

  watch(
    () => options.nearbyParams,
    () => {
      if (options.scope === 'nearby') {
        loadPosts()
      }
    },
    { deep: true }
  )

  onMounted(() => {
    loadPosts()
  })

  return {
    postStore,
    posts,
    selectedType,
    canLoadMore,
    showFullView,
    showEditModal,
    selectedPost,
    editingPost,
    handleTypeFilter,
    handleLoadMore,
    handleRetry,
    handlePostClick,
    handlePostEdit,
    handlePostDelete,
    handlePostSaved,
    closeFullView,
    closeEditModal,
  }
}

