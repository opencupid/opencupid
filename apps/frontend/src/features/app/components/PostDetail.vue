<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { bus } from '@/lib/bus'
// @ts-expect-error component resolution
import PostFullView from '@/features/posts/components/PostFullView.vue'
import { usePostStore } from '@/features/posts/stores/postStore'

const activeId = ref<string | null>(null)
const isActive = computed(() => activeId.value !== null)
const postStore = usePostStore()
const activePost = ref<any | null>(null)

async function loadPost(id: string) {
  // try existing first
  const existing = postStore.getPostById?.(id)
  if (existing) {
    activePost.value = existing
    return
  }
  try {
    const fetched = await postStore.fetchPost?.(id)
    activePost.value = fetched
  } catch (e) {
    console.error('Failed to fetch post', e)
  }
}

function show(id: string) {
  activeId.value = id
  loadPost(id)
  lockScroll()
}
function hide() {
  activeId.value = null
  activePost.value = null
  unlockScroll()
}

function lockScroll() {
  document.documentElement.classList.add('detail-view-open')
  document.body.classList.add('detail-view-open')
}
function unlockScroll() {
  document.documentElement.classList.remove('detail-view-open')
  document.body.classList.remove('detail-view-open')
}

onMounted(() => {
  bus.on('detail:post:show', ({ id }) => show(id))
  bus.on('detail:post:hide', () => hide())
})
onUnmounted(() => {
  bus.off('detail:post:show')
  bus.off('detail:post:hide')
})

const handleClose = () => hide()
</script>

<template>
  <teleport to="body">
    <div v-show="isActive" class="detail-overlay">
      <div class="detail-container">
        <PostFullView
          v-if="activePost"
          :post="activePost"
          @close="handleClose"
          @edit="() => {}"
          @delete="() => {}"
        />
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.detail-overlay { position: fixed; inset: 0; z-index: 1050; background: rgba(0,0,0,0.35); display: flex; }
.detail-container { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; background: var(--bs-body-bg); }
.detail-view-open { overflow: hidden !important; }
</style>