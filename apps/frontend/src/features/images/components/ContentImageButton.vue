<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import { MAX_IMAGES_PER_GALLERY } from '@zod/image/image.dto'

const props = withDefaults(
  defineProps<{ contentId?: string; maxImages?: number }>(),
  { maxImages: MAX_IMAGES_PER_GALLERY }
)
const { t } = useI18n()

const draftKey = useId()
const store = props.contentId
  ? useUserContentImageStore({ contentId: props.contentId })
  : useUserContentImageStore({ draftKey })

const showModal = ref(false)

onMounted(() => {
  if (props.contentId) store.load()
})

defineExpose({
  getImageIds: () => store.images.map((i) => i.id),
  markSaved: () => store.$reset(),
})
</script>

<template>
  <BFormGroup>
    <div class="d-flex align-items-center flex-wrap gap-2">
      <BButton
        variant="link-secondary"
        @click="showModal = true"
      >
        <IconPhoto class="svg-icon me-2" />
        {{ t('userContent.image_button.label') }}
      </BButton>
      <button
        v-for="img in store.images"
        :key="img.id"
        type="button"
        class="content-image-button__thumb"
        :aria-label="t('userContent.image_button.modal_title')"
        @click="showModal = true"
      >
        <ImageTag
          :image="img"
          variant="thumb"
          className="rounded"
        />
      </button>
    </div>
    <BModal
      v-model="showModal"
      size="lg"
      :title="t('userContent.image_button.modal_title')"
    >
      <ImageEditor
        :store="store"
        :minImages="0"
        :maxImages="props.maxImages"
      />
    </BModal>
  </BFormGroup>
</template>

<style scoped lang="scss">
.content-image-button__thumb {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: hidden;
  border-radius: 0.375rem;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
