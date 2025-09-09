<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { bus } from '@/lib/bus'
import PublicProfile from '@/features/publicprofile/components/PublicProfile.vue'

const activeId = ref<string | null>(null)
const isActive = computed(() => activeId.value !== null)

function show(id: string) {
  activeId.value = id
  lockScroll()
}
function hide() {
  activeId.value = null
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
  bus.on('detail:profile:show', ({ id }) => show(id))
  bus.on('detail:profile:hide', () => hide())
})
onUnmounted(() => {
  bus.off('detail:profile:show')
  bus.off('detail:profile:hide')
})

const handleBack = () => hide()
</script>

<template>
  <div v-show="isActive" class="detail-view">
    <div class="detail-container">
      <PublicProfile
        v-if="activeId"
        :id="activeId"
        class="shadow-lg mb-3 pb-5"
        @intent:back="handleBack"
        @intent:message="() => {}"
        @hidden="() => hide()"
      />
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
}
.detail-container {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bs-body-bg);
}
.detail-view-open {
  overflow: hidden !important;
}
</style>
