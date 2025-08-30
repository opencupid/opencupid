<script setup lang="ts">
import { ref } from 'vue'

import { BCarousel } from 'bootstrap-vue-next'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import IconCross from '@/assets/icons/interface/cross.svg'
import ImageTag from '@/features/images/components/ImageTag.vue'

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const showModal = ref(false)
const slide = ref(0)

const handleImageClick = () => (showModal.value = true)

const handleCloseClick = () => (showModal.value = false)
</script>

<template>
  <div class="image-carousel">
    <BCarousel controls v-model="slide" v-show="!showModal" class="h-100">
      <BCarouselSlide
        v-for="img in props.profile.profileImages"
        :key="img.position"
        @click="handleImageClick"
        class="w-100 h-100 bg-black"
      >
        <template #img>
          <div class="ratio ratio-4x3">
            <ImageTag :image="img" className="fitted-image" variant="profile" />
          </div>
        </template>
      </BCarouselSlide>
    </BCarousel>
    <BModal
      v-model="showModal"
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
      <BCarousel controls indicators v-model="slide" class="w-100 h-100" v-show="showModal">
        <BCarouselSlide
          v-for="img in props.profile.profileImages"
          :key="img.position"
          @click="handleCloseClick"
          class="bg-black d-flex justify-content-center align-items-center flex-column h-100"
        >
          <template #img>
            <div
              class="w-100 h-100 d-flex justify-content-center align-items-center overflow-hidden"
            >
              <ImageTag :image="img" className="fitted-image" context="full" />
            </div>
          </template>
        </BCarouselSlide>
      </BCarousel>
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
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center;
  }

  .carousel-inner {
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
  height: 100% !important;
  .carousel-inner {
    width: 100%;
    height: 100% !important;
  }
}
</style>
