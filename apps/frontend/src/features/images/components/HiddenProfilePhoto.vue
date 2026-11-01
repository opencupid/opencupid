<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import photoHiddenUrl from '@/assets/images/app/photo-hidden.svg?url'

defineProps<{
  className?: string
}>()

const emit = defineEmits<{ load: [] }>()

const { t } = useI18n()
</script>

<template>
  <img
    :src="photoHiddenUrl"
    :alt="t('profiles.photo_hidden')"
    :title="t('profiles.photo_hidden')"
    :class="['hidden-profile-photo', className]"
    data-testid="hidden-profile-photo"
    @load="emit('load')"
  />
</template>

<style scoped>
.hidden-profile-photo {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
</style>
