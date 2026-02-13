import { ref, computed, watch } from 'vue'
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
  const activeTab = ref('all')
  const showCreateModal = ref(false)
  const locationPermission = ref(false)
  const userLocation = ref<{ lat: number; lon: number } | null>(null)
  const isDetailView = ref(false)
  const showFullView = ref(false)
  const editingPost = ref(null)
  const selectedPost = ref(null)
  const isInitialized = ref(false)

  // Computed properties
  const nearbyParams = computed(() => {
    if (!userLocation.value) {
      return { lat: 0, lon: 0, radius: 50 }
    }
    return {
      lat: userLocation.value.lat,
      lon: userLocation.value.lon,
      radius: 50,
    }
  })

  const ownerProfile = computed(() => ownerStore.profile)

  // Bootstrap mechanism
  const initialize = async () => {
    // Ensure ownerProfile is initialized
    await useBootstrap().bootstrap()

    if (!ownerProfile.value) {
      console.error('Owner profile not found')
      return
    }

    isInitialized.value = true
  }

  // Location handling
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      })
    })
  }

  const requestLocation = async () => {
    try {
      const position = await getCurrentPosition()
      userLocation.value = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }
      locationPermission.value = true
    } catch (error) {
      console.error('Failed to get location:', error)
    }
  }

  // Watch for Nearby tab activation
  watch(activeTab, (newTab) => {
    if (newTab === 'nearby' && !locationPermission.value) {
      requestLocation()
    }
  })

  // Post manipulation helpers
  function toListPost(post: any) {
    return {
      ...post,
      isOwn: true,
    }
  }

  function upsertIntoActiveList(post: any) {
    const normalized = toListPost(post)

    if (activeTab.value === 'my') {
      const idx = postStore.myPosts.findIndex(item => item.id === post.id)
      if (idx === -1) {
        postStore.myPosts.unshift(post)
      } else {
        postStore.myPosts[idx] = post
      }
      return
    }

    const idx = postStore.posts.findIndex(item => item.id === post.id)
    if (idx === -1) {
      postStore.posts.unshift(normalized as any)
    } else {
      postStore.posts[idx] = normalized as any
    }
  }

  // Post handlers
  function closePostOverlays() {
    showFullView.value = false
    showCreateModal.value = false
    editingPost.value = null
    selectedPost.value = null
  }

  async function handleDelete(post?: any) {
    if (!post || !confirm(t('posts.messages.confirm_delete'))) {
      return
    }

    const success = await postStore.deletePost(post.id)
    if (success) {
      closePostOverlays()
    }
  }

  async function handleHide(post?: any) {
    if (!post) {
      return
    }

    const isVisible = post?.isVisible !== false
    const updatedPost = isVisible
      ? await postStore.hidePost(post.id)
      : await postStore.showPost(post.id)

    if (updatedPost) {
      closePostOverlays()
    }
  }

  async function handlePostListIntent(event: string, post?: any) {
    switch (event) {
      case 'fullview':
        selectedPost.value = post
        editingPost.value = null
        showCreateModal.value = false
        showFullView.value = true
        break
      case 'create':
        editingPost.value = null
        showCreateModal.value = true
        showFullView.value = true
        break
      case 'edit':
        editingPost.value = post
        showCreateModal.value = false
        showFullView.value = true
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
        showFullView.value = false
        break
    }
  }

  return {
    // State
    activeTab,
    showCreateModal,
    locationPermission,
    userLocation,
    nearbyParams,
    isDetailView,
    showFullView,
    editingPost,
    selectedPost,
    isInitialized,
    ownerProfile,

    // Methods
    initialize,
    requestLocation,
    handlePostListIntent,
    handleDelete,
    handleHide,
    closePostOverlays,
  }
}
