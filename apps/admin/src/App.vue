<script setup lang="ts">
import { computed } from 'vue'

const version = computed(() => __APP_VERSION__.app)
const listmonkUrl = computed(() => {
  const host = window.location.hostname
  const listsDomain = host.replace(/^admin\./, 'lists.')
  return `https://${listsDomain}/admin/`
})
</script>

<template>
  <div class="d-flex">
    <nav
      class="sidebar d-flex flex-column p-3"
      style="width: 220px"
    >
      <h5 class="text-white mb-4">Admin</h5>
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
        <li class="nav-item mt-3">
          <a
            class="nav-link"
            :href="listmonkUrl"
            target="_blank"
            rel="noopener"
            >Listmonk</a
          >
        </li>
      </ul>
      <div class="mt-auto text-white-50 small">v{{ version }}</div>
    </nav>
    <main
      class="flex-grow-1 p-4 pb-5 bg-light"
      style="min-height: 100vh"
    >
      <router-view />
    </main>
  </div>
</template>
