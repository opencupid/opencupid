<script setup lang="ts">
import { computed } from 'vue'

const version = computed(() => __APP_VERSION__)
</script>

<template>
  <div class="d-flex">
    <nav
      class="sidebar d-flex flex-column p-3"
      style="width: 220px; flex-shrink: 0"
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
    </nav>
    <main
      class="flex-grow-1 p-4 pb-5 bg-light"
      style="min-height: 100vh; min-width: 0"
    >
      <router-view />
    </main>
  </div>
</template>
