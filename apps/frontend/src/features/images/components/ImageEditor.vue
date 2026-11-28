<script setup lang="ts">
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { VueDraggableNext } from 'vue-draggable-next'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'

import type { OwnerImage } from '@zod/image/image.dto'
import type { GalleryStore } from '@/features/images/stores/galleryStore'
import { useImageEditor } from '@/features/images/composables/useImageEditor'

import ImageUpload from './ImageUpload.vue'
import ImageTag from './ImageTag.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'
import IconHeart from '@/assets/icons/interface/heart-filled.svg'

const props = withDefaults(
  defineProps<{
    store: GalleryStore
    minImages: number
    maxImages?: number
    autoLoad?: boolean
  }>(),
  {
    maxImages: 6,
    autoLoad: true,
  }
)

const { t } = useI18n()

const {
  model,
  isRemoving,
  placeholderSlots,
  remainingSlots,
  isDeletable,
  handleDelete,
  handleReorder,
  checkMove,
} = useImageEditor({
  store: props.store,
  minImages: () => props.minImages,
  maxImages: () => props.maxImages,
  autoLoad: () => props.autoLoad,
})

const isRestricted = (img: OwnerImage) => props.store.restriction?.isRestricted(img) === true
const restrictedTitle = computed(() => {
  const restriction = props.store.restriction
  if (!restriction) return undefined
  return t(restriction.isActive ? restriction.titleKey : restriction.inactiveTitleKey)
})
</script>

<template>
  <div class="image-editor">
    <div class="row">
      <div class="col-sm-12">
        <VueDraggableNext
          class="row row-cols-2 row-cols-sm-3 g-4 mx-4 sortable-grid"
          v-model="model"
          ghost-class="ghost"
          :sort="true"
          :filter="'.nodrag'"
          :dragoverBubble="true"
          :move="checkMove"
          @change="handleReorder"
        >
          <div
            v-for="img in model"
            :key="img.id"
            class="col thumbnail"
            :id="img.id"
          >
            <div class="actions nodrag">
              <button
                class="btn btn-secondary btn-rounded"
                @mousedown.stop.prevent
                @click="handleDelete(img)"
                :disabled="isRemoving[img.id]"
                v-if="isDeletable"
                :title="t('profiles.image_editor.delete_button_title')"
              >
                <FontAwesomeIcon :icon="faXmark" />
              </button>
            </div>
            <div :class="{ removing: isRemoving[img.id] }">
              <div
                class="ratio ratio-1x1 rounded"
                :class="{
                  restricted: isRestricted(img),
                  'restricted-inactive': isRestricted(img) && !props.store.restriction?.isActive,
                }"
                :title="isRestricted(img) ? restrictedTitle : undefined"
                :data-testid="isRestricted(img) ? 'restricted-image' : undefined"
              >
                <ImageTag
                  :image="img"
                  className="rounded"
                  variant="card"
                />
                <IconHeart
                  v-if="isRestricted(img)"
                  class="restricted-icon"
                  role="img"
                  :aria-label="restrictedTitle"
                />
              </div>
            </div>
          </div>
          <div
            v-if="remainingSlots > 0"
            class="col nodrag"
          >
            <div class="ratio ratio-1x1">
              <div class="btn btn-outline-primary w-100 file-upload-label">
                <ImageUpload :store="props.store" />
              </div>
            </div>
          </div>

          <div
            v-for="(_, i) in placeholderSlots"
            :key="'placeholder-' + i"
            class="col nodrag"
          >
            <div class="opacity-25 placeholder ratio ratio-1x1 bg-light rounded">
              <IconPhoto class="svg-icon-100" />
            </div>
          </div>
        </VueDraggableNext>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
img {
  object-fit: cover;
}

.removing {
  opacity: 0.2;
}

/* Restricted photo: the dating red halo and a heart in the corner. */
.restricted {
  box-shadow: 0 0 0 3px rgba(var(--bs-dating-rgb), 0.85);
}
.restricted .restricted-icon {
  /* .ratio stretches its children; pin the icon to a corner instead. */
  inset: auto auto 0.4rem 0.4rem;
  width: 1.5rem;
  height: 1.5rem;
  color: rgb(var(--bs-dating-rgb));
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
/* Nobody can see it right now: also faded. */
.restricted-inactive :deep(img) {
  opacity: 0.45;
}

.thumbnail {
  position: relative;
}

.actions {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  z-index: 1;
}

.actions {
  .btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.sortable-chosen {
  opacity: 0.3;
}

.sortable-chosen,
.fade-enter-from,
.fade-leave-to {
  opacity: 0.4;
  transform: translateY(10px);
}

.ghost,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

/* For reordering */
.sortable-grid {
  transition: transform 0.3s ease;
}

.fade-move {
  transition: transform 0.3s ease;
}
</style>
