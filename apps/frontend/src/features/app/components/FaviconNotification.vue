<script setup lang="ts">
import { watch } from 'vue'
import Tinycon from 'tinycon'
import { useNotificationState } from '../composables/useNotificationState'

const { hasNotifications } = useNotificationState()

watch(
  hasNotifications,
  (show) => {
    Tinycon.setBubble(show ? 1 : 0)
  },
  { immediate: true }
)
</script>

<template>
  <span />
</template>
