<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

import { useUserContentImageStore } from '@/features/images/stores/userContentImageStore'
import { useImageEditor } from '@/features/images/composables/useImageEditor'
import ImageUpload from '@/features/images/components/ImageUpload.vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import { MAX_IMAGES_PER_GALLERY } from '@zod/image/image.dto'

const props = withDefaults(defineProps<{ contentId?: string; maxImages?: number }>(), {
  maxImages: MAX_IMAGES_PER_GALLERY,
})
const { t } = useI18n()

const draftKey = useId()
const store = props.contentId
  ? useUserContentImageStore({ contentId: props.contentId })
  : useUserContentImageStore({ draftKey })

const { isRemoving, remainingSlots, handleDelete } = useImageEditor({
  store,
  minImages: 0,
  maxImages: () => props.maxImages,
  autoLoad: () => !!props.contentId,
})

defineExpose({
  getImageIds: () => store.images.map((i) => i.id),
  markSaved: () => store.$reset(),
})
</script>

<template>
  <div class="d-flex align-items-center flex-wrap gap-2">
    <div
      class="attach-image-button__upload"
      :class="{ 'attach-image-button__upload--disabled': remainingSlots <= 0 }"
      :aria-disabled="remainingSlots <= 0"
    >
      <ImageUpload :store="store" />
    </div>
    <div
      v-for="img in store.images"
      :key="img.id"
      class="attach-image-button__thumb"
      :class="{ removing: isRemoving[img.id] }"
    >
      <ImageTag
        :image="img"
        variant="thumb"
        className="rounded"
      />
      <button
        type="button"
        data-test="thumb-remove"
        class="attach-image-button__thumb-remove btn btn-sm btn-secondary"
        :disabled="isRemoving[img.id]"
        :title="t('profiles.image_editor.delete_button_title')"
        :aria-label="t('profiles.image_editor.delete_button_title')"
        @click="handleDelete(img)"
      >
        <FontAwesomeIcon :icon="faXmark" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.attach-image-button__upload {
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.attach-image-button__thumb {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;

  &.removing {
    opacity: 0.4;
  }

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.375rem;
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
.attach-image-button__thumb:focus-within .attach-image-button__thumb-remove,
.attach-image-button__thumb-remove:focus-visible {
  opacity: 1;
}
</style>
