<script setup lang="ts">
import IconHide from '@/assets/icons/interface/hide.svg'
import IconShow from '@/assets/icons/interface/unhide.svg'
import IconDelete from '@/assets/icons/interface/delete.svg'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'

defineProps<{
  isVisible: boolean
}>()

defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'hide'): void
}>()
</script>

<template>
  <div>
    <BButton
      @click.stop="$emit('edit')"
      variant="link-secondary"
      size="sm"
      :title="$t('posts.actions.edit')"
      :aria-label="$t('posts.actions.edit')"
    >
      <IconEdit class="svg-icon" />
    </BButton>
    <BButton
      @click.stop="$emit('delete')"
      variant="link-secondary"
      size="sm"
      :title="$t('posts.actions.delete')"
      :aria-label="$t('posts.actions.delete')"
    >
      <IconDelete class="svg-icon" />
    </BButton>
    <BButton
      @click.stop="$emit('hide')"
      variant="link-secondary"
      size="sm"
      :title="isVisible ? $t('posts.actions.hide') : $t('posts.actions.show')"
      :aria-label="isVisible ? $t('posts.actions.hide') : $t('posts.actions.show')"
    >
      <IconHide
        v-if="isVisible"
        class="svg-icon"
      />
      <IconShow
        v-else
        class="svg-icon"
      />
    </BButton>
  </div>
</template>
