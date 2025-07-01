<script setup lang="ts">
import { onMounted } from 'vue'
import MatchesList from '../components/MatchesList.vue'
import { useDatingInteractions } from '../composables/useDatingInteractions'

const { matches, refreshInteractions } = useDatingInteractions()

onMounted(() => {
  refreshInteractions()
})
</script>

<template>
  <main class="container mt-3 pt-5">
    <MatchesList :edges="matches" />
  </main>
</template>
