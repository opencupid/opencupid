import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { usePostStore } from '../stores/postStore'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

export function usePostsViewModel() {
  const { t } = useI18n()
  const postStore = usePostStore()
  const ownerStore = useOwnerProfileStore()

  // State management
  const activeTab = ref<'all' | 'recent' | 'my'>('all')
  const viewMode = ref('grid')
  const showCreateModal = ref(false)
  const isDetailView = ref(false)
  const editingPost = ref<OwnerPost | null>(null)
  const selectedPost = ref<PublicPostWithProfile | OwnerPost | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)

  // Computed properties
  const ownerProfile = computed(() => ownerStore.profile)

  // Bootstrap mechanism
  const initialize = async () => {
    isLoading.value = true
    try {
      // Ensure ownerProfile is initialized
      await useBootstrap().bootstrap()

      if (!ownerProfile.value) {
        console.error('Owner profile not found')
        return
      }

      // Fetch posts eagerly so both grid and map views have data
      await postStore.loadPosts('all')

      isInitialized.value = true
    } finally {
      isLoading.value = false
    }
  }

  // Post manipulation helpers
  function toListPost(post: PublicPostWithProfile | OwnerPost) {
    return {
      ...post,
      isOwn: true,
    }
  }

  function upsertIntoActiveList(post: PublicPostWithProfile | OwnerPost) {
    const normalized = toListPost(post)

    if (activeTab.value === 'my') {
      const idx = postStore.myPosts.findIndex((item) => item.id === post.id)
      if (idx === -1) {
        postStore.myPosts.unshift(post as OwnerPost)
      } else {
        postStore.myPosts[idx] = post as OwnerPost
      }
      return
    }

    const idx = postStore.posts.findIndex((item) => item.id === post.id)
    if (idx === -1) {
      postStore.posts.unshift(normalized as PublicPostWithProfile)
    } else {
      postStore.posts[idx] = normalized as PublicPostWithProfile
    }
  }

  // Post handlers
  function closePostOverlays() {
    showCreateModal.value = false
    editingPost.value = null
    selectedPost.value = null
  }

  async function handleDelete(post?: PublicPostWithProfile | OwnerPost) {
    if (!post || !confirm(t('posts.messages.confirm_delete'))) {
      return
    }

    const success = await postStore.deletePost(post.id)
    if (success) {
      closePostOverlays()
    }
  }

  async function handleHide(post?: PublicPostWithProfile | OwnerPost) {
    if (!post) {
      return
    }

    // Only OwnerPost has isVisible property
    const isVisible = 'isVisible' in post ? post.isVisible !== false : true
    const updatedPost = isVisible
      ? await postStore.hidePost(post.id)
      : await postStore.showPost(post.id)

    if (updatedPost) {
      closePostOverlays()
    }
  }

  async function handlePostListIntent(event: string, post?: PublicPostWithProfile | OwnerPost) {
    switch (event) {
      case 'fullview':
        selectedPost.value = post ?? null
        editingPost.value = null
        showCreateModal.value = false
        break
      case 'create':
        selectedPost.value = null
        editingPost.value = null
        showCreateModal.value = true
        break
      case 'edit':
        selectedPost.value = null
        editingPost.value = post as OwnerPost
        showCreateModal.value = false
        break
      case 'close':
        closePostOverlays()
        break
      case 'hide':
        await handleHide(post)
        break
      case 'delete':
        await handleDelete(post)
        break
      case 'saved':
        if (post && (showCreateModal.value || editingPost.value)) {
          upsertIntoActiveList(post)
        }
        closePostOverlays()
        break
    }
  }

  return {
    // State
    activeTab,
    viewMode,
    showCreateModal,
    isDetailView,
    editingPost,
    selectedPost,
    isInitialized,
    isLoading,
    ownerProfile,

    // Methods
    initialize,
    handlePostListIntent,
    handleDelete,
    handleHide,
    closePostOverlays,
  }
}
