<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{
  post:
    | {
        type: 'OFFER' | 'REQUEST'
        id: string
        content: string
        createdAt: Date
        updatedAt: Date
        postedById: string
        postedBy: {
          id: string
          publicName: string
          profileImages: {
            position: number
            altText: string
            mimeType: string
            variants: { url: string; size: string }[]
          }[]
        }
      }
    | {
        type: 'OFFER' | 'REQUEST'
        id: string
        content: string
        isDeleted: boolean
        isVisible: boolean
        createdAt: Date
        updatedAt: Date
        postedById: string
      }
}>()
const { t } = useI18n()
</script>

<template>
  <span class="badge post-type-badge" :class="`post-type-badge--${post.type.toLowerCase()}`">
    {{ t(`posts.types.${post.type}`) }}
  </span>
</template>

<style scoped>
.post-type-badge--offer {
  background: #d1fae5;
  color: #065f46;
}

.post-type-badge--request {
  background: #dbeafe;
  color: #1e40af;
}
</style>
