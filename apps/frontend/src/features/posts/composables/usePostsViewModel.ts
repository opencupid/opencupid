import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { usePostStore } from '../stores/postStore'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import type { LocationDTO } from '@zod/dto/location.dto'

export function usePostsViewModel() {
  const { t } = useI18n()
  const router = useRouter()
  const postStore = usePostStore()
  const ownerStore = useOwnerProfileStore()

  // State management
  const activeTab = ref<'all' | 'recent' | 'my'>('all')
  const viewMode = ref('map')
  const isDetailView = ref(false)
  const filterLocation = ref<LocationDTO>({ country: '' })
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

      if (ownerProfile.value?.location) {
        filterLocation.value = { ...ownerProfile.value.location }
      }

      isInitialized.value = true
    } finally {
      isLoading.value = false
    }
  }

  // Reload posts when view mode changes (also handles initial load after bootstrap)
  watch([viewMode, isInitialized], () => {
    if (isInitialized.value) {
      postStore.loadPosts('all')
    }
  })

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
        break
      case 'create':
        router.push({ name: 'CreatePost' })
        break
      case 'edit':
        if (post) {
          router.push({ name: 'EditPost', params: { postId: post.id } })
        }
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
        if (post) {
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
    isDetailView,
    filterLocation,
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
