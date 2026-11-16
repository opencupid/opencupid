<script setup lang="ts">
import { shallowRef, computed, watch } from 'vue'

import { Carousel, Slide, Navigation, Pagination } from 'vue3-carousel'
import 'vue3-carousel/dist/carousel.css'

import type { OwnerImage, PublicImage } from '@zod/image/image.dto'
import ChevronLeftIcon from '@/assets/icons/arrows/arrow-single-left.svg'
import ChevronRightIcon from '@/assets/icons/arrows/arrow-single-right.svg'
import BlurhashImage from '@/features/images/components/BlurhashImage.vue'
import FullscreenImageModal from '@/features/images/components/FullscreenImageModal.vue'

const props = defineProps<{
  images: ReadonlyArray<OwnerImage | PublicImage>
}>()

const showFullscreen = shallowRef(false)
const inlineSlide = shallowRef(0)

const handleImageClick = () => {
  showFullscreen.value = true
}

const carouselProps = {
  itemsToShow: 1,
  snapAlign: 'start',
  mouseDrag: false,
  touchDrag: true,
  wrapAround: true,
  mouseWheel: false,
} as const

const shouldShowNavButtons = computed(() => props.images.length > 1)

watch(
  () => props.images,
  () => {
    inlineSlide.value = 0
  }
)
</script>

<template>
  <div class="image-carousel h-100">
    <Carousel
      v-model="inlineSlide"
      v-show="!showFullscreen"
      v-bind="carouselProps"
      class="h-100"
    >
      <Slide
        v-for="img in props.images"
        :key="img.position"
        @click="handleImageClick"
      >
        <div class="ratio ratio-4x3">
          <BlurhashImage
            :image="img"
            variant="profile"
            imgClass="fitted-image"
          />
        </div>
      </Slide>

      <template #addons>
        <Navigation v-if="shouldShowNavButtons">
          <template #prev>
            <ChevronLeftIcon class="carousel-nav-icon" />
          </template>
          <template #next>
            <ChevronRightIcon class="carousel-nav-icon" />
          </template>
        </Navigation>
      </template>
    </Carousel>

    <FullscreenImageModal
      v-model="showFullscreen"
      :teleport-disabled="true"
    >
      <Carousel
        v-model="inlineSlide"
        v-bind="carouselProps"
        class="w-100 h-100"
      >
        <Slide
          v-for="img in props.images"
          :key="img.position"
          class="bg-black"
          @click="showFullscreen = false"
        >
          <BlurhashImage
            :image="img"
            variant="full"
            imgClass="fitted-image"
          />
        </Slide>

        <template #addons>
          <Navigation v-if="shouldShowNavButtons">
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
    </FullscreenImageModal>
  </div>
</template>

<style lang="scss">
.modal.fullscreen-image-modal {
  .carousel__slide {
    height: 100%;
  }

  .carousel__track {
    height: 100%;
  }
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
.modal.fullscreen-image-modal {
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
</style>
