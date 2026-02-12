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
  const isLoadingMore = ref(false)
  const hasMorePosts = ref(true)
  const isInitialized = ref(false)

  const showFullView = ref(false)
  const showEditModal = ref(false)
  const selectedPost = ref<PublicPostWithProfile | OwnerPost | null>(null)
  const editingPost = ref<OwnerPost | null>(null)

  const posts = computed(() => {
    return options.scope === 'my' ? postStore.myPosts : postStore.posts
  })

  const loadPosts = async (append = false) => {
    if (!append) {
      currentPage.value = 0
      hasMorePosts.value = true
    } else {
      isLoadingMore.value = true
    }
    
    const fetched = await postStore.loadPosts(options.scope || 'all', {
      type: (selectedType.value as PostTypeType) || undefined,
      page: currentPage.value,
      pageSize,
      nearbyParams: options.nearbyParams,
    })

    if (fetched.length < pageSize) {
      hasMorePosts.value = false
    }

    if (append) {
      isLoadingMore.value = false
    } else {
      isInitialized.value = true
    }
  }

  const handleTypeFilter = () => {
    loadPosts()
  }

  const handleLoadMore = async () => {
    currentPage.value++
    await loadPosts(true)
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
    showFullView.value = true
  }

  const handlePostDelete = async (post: PublicPostWithProfile | OwnerPost) => {
    if (confirm(t('posts.messages.confirm_delete'))) {
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
    showFullView.value = false
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
    isLoadingMore,
    hasMorePosts,
    isInitialized,
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
