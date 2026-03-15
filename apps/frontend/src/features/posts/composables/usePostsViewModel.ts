import { ref, computed } from 'vue'
import type { MapBounds } from '@/features/shared/components/OsmPoiMap.types'
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

  // Map bounds handler
  const onBoundsChanged = async (bounds: MapBounds) => {
    isLoading.value = true
    try {
      await postStore.fetchPostsInBounds(bounds)
    } finally {
      isLoading.value = false
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

  function handleFullview(post?: PublicPostWithProfile | OwnerPost) {
    selectedPost.value = post ?? null
  }

  function handleCreate() {
    router.push({ name: 'CreatePost' })
  }

  function handleEdit(post?: PublicPostWithProfile | OwnerPost) {
    if (post) {
      router.push({ name: 'EditPost', params: { postId: post.id } })
    }
  }

  function handleSaved(post?: PublicPostWithProfile | OwnerPost) {
    if (post) {
      postStore.upsertPost(post)
    }
    closePostOverlays()
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
    onBoundsChanged,
    handleFullview,
    handleCreate,
    handleEdit,
    handleDelete,
    handleHide,
    handleSaved,
    closePostOverlays,
  }
}
