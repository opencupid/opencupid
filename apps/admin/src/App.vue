<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { BOffcanvas } from 'bootstrap-vue-next'

const version = computed(() => __APP_VERSION__)
const route = useRoute()

const STORAGE_KEY = 'admin-sidebar-open'

const sidebarOpen = ref(localStorage.getItem(STORAGE_KEY) === 'true')

watch(sidebarOpen, (val) => {
  localStorage.setItem(STORAGE_KEY, String(val))
})

watch(
  () => route.path,
  () => {
    if (window.innerWidth < 992) {
      sidebarOpen.value = false
    }
  }
)
</script>

<template>
  <header class="d-lg-none topbar d-flex align-items-center px-3">
    <button
      class="sidebar-toggle me-3"
      type="button"
      aria-label="Toggle navigation"
      @click="sidebarOpen = !sidebarOpen"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line
          x1="3"
          y1="6"
          x2="21"
          y2="6"
        />
        <line
          x1="3"
          y1="12"
          x2="21"
          y2="12"
        />
        <line
          x1="3"
          y1="18"
          x2="21"
          y2="18"
        />
      </svg>
    </button>
    <span class="fw-semibold">Admin</span>
  </header>

  <div class="d-flex">
    <BOffcanvas
      v-model="sidebarOpen"
      placement="start"
      responsive="lg"
      :teleport-disabled="true"
      no-header
      class="sidebar"
      body-class="d-flex flex-column"
    >
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h5 class="text-white mb-0">Admin</h5>
        <button
          class="btn-close btn-close-white d-lg-none"
          type="button"
          aria-label="Close"
          @click="sidebarOpen = false"
        />
      </div>
      <ul class="nav flex-column">
        <li class="nav-item">
          <router-link
            class="nav-link"
            to="/"
            >Dashboard</router-link
          >
        </li>
        <li class="nav-item">
          <router-link
            class="nav-link"
            to="/users"
            >Users</router-link
          >
        </li>
        <li class="nav-item">
          <router-link
            class="nav-link"
            to="/profiles"
            >Profiles</router-link
          >
        </li>
        <li class="nav-item">
          <router-link
            class="nav-link"
            to="/moderation"
            >Moderation</router-link
          >
        </li>
        <li class="nav-item">
          <router-link
            class="nav-link"
            to="/tags"
            >Tags</router-link
          >
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            href="/bull-board/"
            target="_blank"
            rel="noopener"
            >Queues</a
          >
        </li>
      </ul>
      <div class="mt-auto text-white-50 small">v{{ version }}</div>
    </BOffcanvas>

    <main
      class="flex-grow-1 p-3 p-lg-4 pb-5 bg-light"
      style="min-height: 100vh; min-width: 0"
    >
      <router-view />
    </main>
  </div>
</template>
