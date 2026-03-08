<script setup lang="ts">
import { shallowRef, reactive, computed, watch } from 'vue'

import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel'
import 'vue3-carousel/dist/carousel.css'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import IconCross from '@/assets/icons/interface/cross.svg'
import ImageTag from '@/features/images/components/ImageTag.vue'
import BlurhashCanvas from '@/features/images/components/BlurhashCanvas.vue'
import { blurhashToDataUrl } from '@/features/images/composables/useBlurhashDataUrl'

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const showFullscreen = shallowRef(false)
const inlineSlide = shallowRef(0)
const fullSlide = shallowRef(0)

const loadedImages = reactive<Record<number, boolean>>({})

const handleImageLoad = (position: number) => {
  loadedImages[position] = true
}

const handleImageClick = () => {
  fullSlide.value = inlineSlide.value
  showFullscreen.value = true
}

const handleCloseClick = () => {
  inlineSlide.value = fullSlide.value
  showFullscreen.value = false
}

const currentImage = computed(() => props.profile.profileImages?.[inlineSlide.value])
const showBlurhash = computed(
  () => currentImage.value?.blurhash && !loadedImages[currentImage.value.position]
)

// Reset carousel to first slide when images change (e.g. after reorder in editor)
watch(
  () => props.profile.profileImages,
  () => {
    inlineSlide.value = 0
    Object.keys(loadedImages).forEach((key) => delete loadedImages[Number(key)])
  }
)
</script>

<template>
  <div class="image-carousel">
    <BlurhashCanvas
      v-if="showBlurhash"
      :blurhash="currentImage!.blurhash!"
      class="blurhash-overlay"
    />
    <Carousel
      v-model="inlineSlide"
      v-show="!showFullscreen"
      class="h-100"
      :items-to-show="1"
      snap-align="start"
    >
      <Slide
        v-for="img in props.profile.profileImages"
        :key="img.position"
        @click="handleImageClick"
      >
        <div class="ratio ratio-4x3">
          <ImageTag
            :image="img"
            className="fitted-image"
            variant="profile"
            @load="handleImageLoad(img.position)"
          />
        </div>
      </Slide>

      <template #addons>
        <Navigation />
      </template>
    </Carousel>

    <BModal
      v-model="showFullscreen"
      centered
      modal-class="carousel-modal"
      :no-close-on-backdrop="false"
      :no-footer="true"
      :no-header="false"
      :no-title="true"
      :title-visually-hidden="true"
      :body-scrolling="false"
      :fullscreen="true"
      :lazy="true"
    >
      <template #header-close>
        <IconCross class="svg-icon" />
      </template>
      <Carousel
        v-model="fullSlide"
        class="w-100 h-100"
        :items-to-show="1"
        snap-align="start"
      >
        <Slide
          v-for="img in props.profile.profileImages"
          :key="img.position"
          class="bg-black"
        >
          <div
            class="w-100 h-100 d-flex justify-content-center align-items-center overflow-hidden"
            :style="
              img.blurhash
                ? {
                    backgroundImage: `url(${blurhashToDataUrl(img.blurhash)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            "
          >
            <ImageTag
              :image="img"
              className="fitted-image"
              variant="full"
            />
          </div>
        </Slide>

        <template #addons>
          <Navigation />
          <Pagination />
        </template>
      </Carousel>
    </BModal>
  </div>
</template>

<style lang="scss">
.profile-image {
  flex: 1;
  height: 100%;
}

.modal.carousel-modal {
  .fitted-image {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center;
  }

  .carousel__slide {
    height: 100%;
  }

  .carousel__track {
    height: 100%;
  }

  .modal-content {
    background-color: transparent;
    border: none;
    box-shadow: none;
  }

  .modal-header {
    border: none;
    padding: 0.5rem;
    background-color: transparent;
    position: absolute;
    z-index: 10;
    width: 100%;

    button {
      margin-top: 3em;
      margin-right: 0;
    }
  }

  .modal-body {
    padding: 0;
    border: none;
  }

  .btn {
    padding: 0.5rem 0.75rem;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border-radius: 50%;
    position: absolute;
    right: 1rem;
    border: none;
  }

  .modal-title {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 0.5rem;
  }

  background-color: transparent;
}

.image-carousel {
  position: relative;
  height: 100% !important;

  .carousel__track {
    height: 100%;
  }

  .carousel__slide {
    height: 100%;
  }

  .fitted-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
}

.blurhash-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
</style>
