import { computed, ref } from 'vue'
import { api, safeApiCall } from '@/lib/api'
import type { BrowseBoundsResponse } from '@zod/apiResponse.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { MapBounds, MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import type { PublicPostWithProfile } from '@zod/post/post.dto'

/**
 * Composable that manages the posts data layer and bounds-scoped tags
 * for the unified browse map. Profile clustering continues to be managed
 * by `useSocialMatchViewModel` / `findProfileStore` — this composable
 * adds the post POIs and tag data on top.
 */
export function useBrowseViewModel() {
  const postPois = ref<MapPoi[]>([])
  const availableTags = ref<PublicTag[]>([])
  const selectedTagIds = ref<string[]>([])
  const isLoadingPosts = ref(false)
  let postAbortController: AbortController | null = null

  async function fetchPostsAndTags(bounds: MapBounds) {
    if (postAbortController) postAbortController.abort()
    const controller = new AbortController()
    postAbortController = controller

    isLoadingPosts.value = true
    try {
      const res = await safeApiCall(() =>
        api.get<BrowseBoundsResponse>('/browse/bounds', {
          params: bounds,
          signal: controller.signal,
        })
      )

      if (!res.data.success) return

      // Map posts to MapPoi[]
      postPois.value = (res.data.posts as PublicPostWithProfile[])
        .filter((p) => p.location?.lat != null && p.location?.lon != null)
        .map((p) => ({
          id: p.id,
          title: p.content?.substring(0, 50) ?? '',
          location: { lat: p.location!.lat!, lon: p.location!.lon! },
          image: p.postedBy?.profileImages?.[0],
          type: 'post',
          source: p,
        }))

      // Update available tags for the filter pill
      availableTags.value = res.data.tags
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      postPois.value = []
    } finally {
      if (postAbortController === controller) {
        isLoadingPosts.value = false
      }
    }
  }

  const filteredPostPois = computed(() => {
    // Posts have no tags — they're always included regardless of tag filter
    return postPois.value
  })

  function toggleTag(id: string) {
    const idx = selectedTagIds.value.indexOf(id)
    if (idx === -1) selectedTagIds.value = [...selectedTagIds.value, id]
    else selectedTagIds.value = selectedTagIds.value.filter((t) => t !== id)
  }

  function clearTags() {
    selectedTagIds.value = []
  }

  return {
    postPois,
    filteredPostPois,
    availableTags,
    selectedTagIds,
    isLoadingPosts,
    fetchPostsAndTags,
    toggleTag,
    clearTags,
  }
}
