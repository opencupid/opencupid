<script setup lang="ts">
import { watch } from 'vue'
import Tinycon from 'tinycon'
import { useNotificationState } from '../composables/useNotificationState'

const { hasNotifications } = useNotificationState()

Tinycon.setOptions({
  width: 6,
  height: 6,
  font: '0px arial',
})

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
