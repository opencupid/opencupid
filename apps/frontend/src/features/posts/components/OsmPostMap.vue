<script setup lang="ts">
import { computed } from 'vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'
import OsmPoiMap, { type MapItem } from '@/features/shared/ui/OsmPoiMap.vue'
import PostCard from './PostCard.vue'

const props = defineProps<{
  posts: (PublicPostWithProfile | OwnerPost)[]
  selectedId?: string
}>()

const emit = defineEmits<{
  (e: 'post:select', post: PublicPostWithProfile | OwnerPost): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'contact', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

// Transform posts to MapItem format
const mapItems = computed<((PublicPostWithProfile | OwnerPost) & MapItem)[]>(() => {
  return props.posts.map(post => ({
    ...post,
    lat: post.lat ?? null,
    lon: post.lon ?? null,
  }))
})

// Wrapper component for the post card in popup
const PostPopupWrapper = {
  props: ['item'],
  emits: ['click', 'edit', 'contact', 'hide', 'delete'],
  components: { PostCard },
  template: `
    <PostCard
      :post="item"
      :showDetails="true"
      @click="$emit('click', item)"
      @edit="$emit('edit', item)"
      @contact="$emit('contact', item)"
      @hide="$emit('hide', item)"
      @delete="$emit('delete', item)"
    />
  `
}
</script>

<template>
  <OsmPoiMap
    :items="mapItems"
    :selectedId="selectedId"
    :popupComponent="PostPopupWrapper"
    @item:select="(id) => {
      const post = posts.find(p => p.id === id)
      if (post) $emit('post:select', post)
    }"
  />
</template>
