<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { VueDraggableNext } from 'vue-draggable-next'
import { useImageStore } from '@/features/images/stores/imageStore'

import type { OwnerProfileImage } from '@zod/profile/profileimage.dto'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

import ImageUpload from './ImageUpload.vue'
import ImageTag from './ImageTag.vue'
import HelpScribble from '@/features/shared/ui/HelpScribble.vue'
import IconPhoto from '@/assets/icons/interface/photo.svg'

import { useI18n } from 'vue-i18n'

const imageStore = useImageStore()

const props = defineProps({
  maxImages: {
    type: Number,
    default: 6,
  },
})

const isRemoving = ref<Record<string, boolean>>({})
const error = ref<string>('')

const { t } = useI18n()

const model = computed({
  get() {
    return imageStore.images
  },
  set(val) {
    imageStore.images = val
  },
})

/**
 * Remove an image by ID
 */
async function handleDelete(image: OwnerProfileImage) {
  isRemoving.value[image.id] = true

  const res = await imageStore.deleteImage(image)
  if (!res.success) {
    error.value = res.message
    isRemoving.value[image.id] = false
    return
  }
}

const handleReorder = async (event: any) => {
  const payload = event.moved
  if (!payload) return
  const newOrder = model.value.map((img, position) => ({
    id: img.id,
    position,
  }))
  const res = await imageStore.reorderImages(newOrder)
}

/**
 * Prevent moving the upload button
 */
function checkMove(evt: any) {
  const el = evt.draggedContext
  return el.futureIndex < model.value.length
}

onMounted(async () => {
  await imageStore.fetchImages()
})

const placeholderSlots = computed(() => {
  const remaining = Math.max(0, props.maxImages - model.value.length - 1) // leave 1 for uploader
  return Array.from({ length: remaining })
})

const remainingSlots = computed(() => {
  return props.maxImages - model.value.length
})

const isDeletable = computed(() => {
  return model.value.length > 1
})
</script>

<template>
  <div class="image-editor">
    <BOverlay :show="imageStore.isLoading" spinner-type="grow" spinner-variant="primary">
      <div class="row">
        <div class="col-sm-12">
          <div v-if="!model || model.length === 0" class="position-absolute end-0 me-5">
<!--            <HelpScribble :text="t('profiles.image_editor_help')" direction="w" /> -->
          </div>
          <VueDraggableNext
            class="row row-cols-2 row-cols-sm-3 row-cols-md-3 g-4  mx-4 sortable-grid"
            v-model="model"
            ghost-class="ghost"
            :sort="true"
            :filter="'.nodrag'"
            :dragoverBubble="true"
            :move="checkMove"
            @change="handleReorder"
          >
            <!-- <TransitionGroup name="fade"> -->
            <div v-for="img in model" :key="img.id" class="col thumbnail" :id="img.id">
              <div class="actions nodrag">
                <button
                  class="btn btn-sm btn-secondary rounded-circle"
                  @mousedown.stop.prevent
                  @click="handleDelete(img)"
                  :disabled="isRemoving[img.id]"
                  v-if="isDeletable"
                >
                  <FontAwesomeIcon :icon="faXmark" />
                </button>
              </div>
              <div :class="{ removing: isRemoving[img.id] }">
                <div class="ratio ratio-1x1">
                  <ImageTag :image="img" className="rounded" variant="card" />
                </div>
              </div>
            </div>
            <div v-if="remainingSlots > 0" class="col nodrag">
              <ImageUpload />
            </div>

            <div v-for="(_, i) in placeholderSlots" :key="'placeholder-' + i" class="col nodrag">
              <div class="opacity-25 placeholder ratio ratio-1x1 bg-light rounded">
                <IconPhoto class="svg-icon-100" />
              </div>
            </div>
            <!-- </TransitionGroup> -->
          </VueDraggableNext>
        </div>
      </div>
    </BOverlay>
  </div>
</template>

<style scoped lang="scss">
img {
  object-fit: cover;
}

.removing {
  opacity: 0.2;
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
