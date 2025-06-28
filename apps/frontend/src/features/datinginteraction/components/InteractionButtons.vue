<script lang="ts" setup>
import IconHeart from '@/assets/icons/interface/heart.svg'
import IconCross from '@/assets/icons/interface/cross.svg'

defineEmits<{
  (e: 'like'): void
  (e: 'pass'): void
  (e: 'message'): void
}>()
</script>

<template>
  <div class="d-flex justify-content-center align-items-center gap-2">
    <BButton variant="secondary" class="btn-icon-lg me-2" @click="$emit('pass')">
      <IconCross class="svg-icon-lg" />
    </BButton>

      <!-- <BButton
        v-if="(!profile.conversation || profile.conversation.status === 'ACCEPTED') && !isOwner"
        :pill="true"
        class="btn-overlay"
        @click="handleMessageIntent"
      >
        <IconMessage class="svg-icon-lg p-0" />
      </BButton> -->
    <BButton  class="btn-icon-lg  btn-dating" @click="$emit('like')">
      <IconHeart class="svg-icon-lg" />
    </BButton>
  </div>
</template>
