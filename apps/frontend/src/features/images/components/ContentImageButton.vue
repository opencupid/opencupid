<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ImageEditor from './ImageEditor.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'

const props = defineProps<{
  contentId?: string
  isEdit: boolean
}>()

const { t } = useI18n()

const showModal = ref(false)

const canManagePhotos = computed(() => props.isEdit && !!props.contentId)

const buttonTitle = computed(() =>
  canManagePhotos.value
    ? t('userContent.actions.manage_photos')
    : t('userContent.actions.save_to_add_photos')
)

const store = computed(() => {
  if (!props.contentId) return null
  return useUserContentImageStore(props.contentId)
})
</script>

<template>
  <BButton
    type="button"
    variant="link-secondary"
    :disabled="!canManagePhotos"
    :title="buttonTitle"
    :aria-label="buttonTitle"
    @click="showModal = true"
  >
    <IconPhoto class="svg-icon" />
  </BButton>

  <BModal
    v-if="store"
    v-model="showModal"
    size="lg"
    fullscreen="sm"
    centered
    :title="t('userContent.labels.photos')"
    :ok-only="true"
    :ok-title="t('community.actions.cancel')"
    ok-variant="outline-secondary"
    @hidden="showModal = false"
  >
    <ImageEditor :store="store" />
  </BModal>
</template>
