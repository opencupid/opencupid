import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  PublicPostWithProfileSchema,
  PublicPostDetailSchema,
  OwnerPostSchema,
  PostSummarySchema,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
  type CreatePostPayload,
  type UpdatePostPayload,
  type PostQueryInput,
  type NearbyPostQueryInput,
  type PostScope,
} from '@zod/post/post.dto'
import { type PostTypeType } from '@zod/generated'
import { storeSuccess } from '@/store/helpers'
import { useUserContentActions } from '@/store/composables/useUserContentActions'

export const usePostStore = defineStore('posts', () => {
  // --- state (refs owned by the store; aliased on return to preserve the public API) ---
  const items = ref<PublicPostWithProfile[]>([])
  const myItems = ref<OwnerPost[]>([])
  const summaries = ref<PostSummary[]>([])
  const currentItem = ref<PublicPostWithProfile | OwnerPost | null>(null)

  // --- generic UserContent actions, shared with future Event store ---
  const a = useUserContentActions<
    PublicPostWithProfile,
    OwnerPost,
    PostSummary,
    PublicPostDetail,
    CreatePostPayload,
    UpdatePostPayload
  >(
    { items, myItems, summaries, currentItem },
    {
      basePath: '/posts',
      wire: { singular: 'post', plural: 'posts' },
      publicSchema: PublicPostWithProfileSchema,
      ownerSchema: OwnerPostSchema,
      summarySchema: PostSummarySchema,
      detailSchema: PublicPostDetailSchema,
      endpoints: {
        list: '',
        mine: 'profile/me',
        nearby: 'nearby',
        recent: 'recent',
        bounds: 'bounds',
      },
      resourceLabel: 'post',
    }
  )

  // --- post-specific getters ---
  const getPostsByType = (type: PostTypeType) => items.value.filter((post) => post.type === type)
  const getOffers = computed(() => items.value.filter((post) => post.type === 'OFFER'))
  const getRequests = computed(() => items.value.filter((post) => post.type === 'REQUEST'))

  // --- post-specific scope dispatcher (PostScope is post-shaped) ---
  async function loadPosts(
    scope: PostScope,
    options: {
      type?: PostTypeType
      page?: number
      pageSize?: number
      nearbyParams?: NearbyPostQueryInput
    } = {}
  ) {
    const { type, page = 0, pageSize = 20, nearbyParams } = options
    const baseQuery: PostQueryInput = {
      type,
      limit: pageSize,
      offset: page * pageSize,
    }
    switch (scope) {
      case 'nearby':
        if (nearbyParams) {
          return await a.fetchNearby({ ...baseQuery, ...nearbyParams })
        }
        return storeSuccess({ posts: [] as PublicPostWithProfile[] })
      case 'recent':
        return await a.fetchRecent(baseQuery)
      case 'my':
        return await a.fetchMine(baseQuery)
      default:
        return await a.fetchList(baseQuery)
    }
  }

  return {
    // state — public names preserved
    posts: items,
    myPosts: myItems,
    postSummaries: summaries,
    currentPost: currentItem,

    // CRUD — public names preserved
    createPost: a.create,
    updatePost: a.update,
    deletePost: a.deleteItem,
    setPostVisibility: a.setVisibility,
    hidePost: a.hide,
    showPost: a.show,

    // fetches — public names preserved
    fetchPosts: a.fetchList,
    fetchNearbyPosts: a.fetchNearby,
    fetchRecentPosts: a.fetchRecent,
    fetchMyPosts: a.fetchMine,
    fetchPostsInBounds: a.fetchInBounds,
    fetchOwnerPost: a.fetchOwner,
    fetchPublicPost: a.fetchPublic,

    // state helpers — public names preserved
    upsertPost: a.upsertItem,
    clearPosts: a.clearItems,
    clearMyPosts: a.clearMyItems,
    setCurrentPost: a.setCurrentItem,

    // post-specific surface
    getPostsByType,
    getOffers,
    getRequests,
    loadPosts,
  }
})
