<script setup lang="ts">
import { shallowRef, reactive, computed, watch } from 'vue'

import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel'
import 'vue3-carousel/dist/carousel.css'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import IconCross from '@/assets/icons/interface/cross.svg'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'
import ChevronRightIcon from '@/assets/icons/arrows/arrow-single-right.svg'
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

const carouselProps = {
  itemsToShow: 1,
  snapAlign: 'start',
  mouseDrag: false,
  touchDrag: true,
  wrapAround: true,
  mouseWheel: false,
} as const

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
  <div class="image-carousel h-100">
    <BlurhashCanvas
      v-if="showBlurhash"
      :blurhash="currentImage!.blurhash!"
      class="blurhash-overlay"
    />
    <Carousel
      v-model="inlineSlide"
      v-show="!showFullscreen"
      v-bind="carouselProps"
      class="h-100"
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
        <Navigation>
          <template #prev>
            <ChevronLeftIcon class="carousel-nav-icon" />
          </template>
          <template #next>
            <ChevronRightIcon class="carousel-nav-icon" />
          </template>
        </Navigation>
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
      :lazy="false"
      no-animation
    >
      <template #header-close>
        <IconCross class="svg-icon" />
      </template>
      <Carousel
        v-model="fullSlide"
        v-bind="carouselProps"
        class="w-100 h-100"
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
          <Navigation>
            <template #prev>
              <ChevronLeftIcon class="carousel-nav-icon" />
            </template>
            <template #next>
              <ChevronRightIcon class="carousel-nav-icon" />
            </template>
          </Navigation>
          <Pagination />
        </template>
      </Carousel>
    </BModal>
  </div>
</template>

<style lang="scss">
.modal.carousel-modal {
  .fitted-image {
    width: 100%;
    height: 100%;
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
  animation: carousel-fade-in 0.3s ease-out;

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

.image-carousel,
.modal.carousel-modal {
  .carousel__prev,
  .carousel__next {
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    padding: 0;
  }

  .carousel-nav-icon {
    width: 1rem;
    height: 1rem;
    fill: white;
    color: white;
  }
}

@keyframes carousel-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.blurhash-overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
