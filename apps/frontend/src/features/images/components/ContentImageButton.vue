<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'

const props = defineProps<{ contentId?: string }>()
const { t } = useI18n()

const draftKey = useId()
const store = props.contentId
  ? useUserContentImageStore({ contentId: props.contentId })
  : useUserContentImageStore({ draftKey })

const showModal = ref(false)

defineExpose({
  getImageIds: () => store.images.map((i) => i.id),
  markSaved: () => store.$reset(),
})
</script>

<template>
  <BFormGroup>
    <BButton
      variant="link-secondary"
      @click="showModal = true"
    >
      <IconPhoto class="svg-icon me-2" />
      {{ t('userContent.image_button.label') }}
    </BButton>
    <BModal
      v-model="showModal"
      size="lg"
      :title="t('userContent.image_button.modal_title')"
    >
      <ImageEditor :store="store" />
    </BModal>
  </BFormGroup>
</template>
