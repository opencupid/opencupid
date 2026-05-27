<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'
import { useImageEditor } from '@/features/images/composables/useImageEditor'
import ImageEditor from '@/features/images/components/ImageEditor.vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import { MAX_IMAGES_PER_GALLERY } from '@zod/image/image.dto'

const props = withDefaults(defineProps<{ contentId?: string; maxImages?: number }>(), {
  maxImages: MAX_IMAGES_PER_GALLERY,
})
const { t } = useI18n()

const draftKey = useId()
const store = props.contentId
  ? useUserContentImageStore({ contentId: props.contentId })
  : useUserContentImageStore({ draftKey })

const { isRemoving, handleDelete } = useImageEditor({
  store,
  minImages: 0,
  maxImages: () => props.maxImages,
  autoLoad: () => !!props.contentId,
})

const showModal = ref(false)

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
      <div
        v-for="img in store.images"
        :key="img.id"
        class="attach-image-button__thumb"
        :class="{ removing: isRemoving[img.id] }"
      >
        <button
          type="button"
          data-test="thumb-wrap"
          class="attach-image-button__thumb-button"
          :aria-label="t('userContent.image_button.thumb_edit_aria')"
          @click="showModal = true"
        >
          <ImageTag
            :image="img"
            variant="thumb"
            className="rounded"
          />
        </button>
        <button
          type="button"
          data-test="thumb-remove"
          class="attach-image-button__thumb-remove btn btn-sm btn-secondary"
          :disabled="isRemoving[img.id]"
          :title="t('profiles.image_editor.delete_button_title')"
          @click.stop="handleDelete(img)"
        >
          <FontAwesomeIcon :icon="faXmark" />
        </button>
      </div>
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
        :autoLoad="false"
      />
    </BModal>
  </BFormGroup>
</template>

<style scoped lang="scss">
.attach-image-button__thumb {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;

  &.removing {
    opacity: 0.4;
  }
}

.attach-image-button__thumb-button {
  width: 100%;
  height: 100%;
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

.attach-image-button__thumb-remove {
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.attach-image-button__thumb:hover .attach-image-button__thumb-remove,
.attach-image-button__thumb-remove:focus-visible {
  opacity: 1;
}
</style>
