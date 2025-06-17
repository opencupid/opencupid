<script setup lang="ts">
import { ref } from 'vue'

import { BCarousel } from 'bootstrap-vue-next'
import { type PublicProfile } from '@zod/profile/profile.dto'
import DoodleIcons from '@/components/icons/DoodleIcons.vue'
import ImageTag from '../image/ImageTag.vue'

const props = defineProps<{
  profile: PublicProfile
}>()

const showModal = ref(false)
const slide = ref(0)

const handleImageClick = () => (showModal.value = true)

const handleCloseClick = () => (showModal.value = false)
</script>

<template>
  <div class="profileImages overflow-hidden">
    <div class="ratio ratio-4x3">
      <BCarousel controls v-model="slide">
        <BCarouselSlide
          v-for="img in props.profile.profileImages"
          :key="img.url!"
          @click="handleImageClick"
          class="w-100 h-100"
        >
          <template #img>
            <ImageTag :image="img" className="" />
          </template>
        </BCarouselSlide>
      </BCarousel>
    </div>
  </div>
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
      <DoodleIcons name="IconCross" class="svg-icon" />
    </template>
    <BCarousel controls indicators v-model="slide" class="w-100 h-100">
      <BCarouselSlide
        v-for="img in props.profile.profileImages"
        :key="img.url!"
        @click="handleCloseClick"
        class="w-100 h-100 wrapper"
      >
        <template #img>
          <ImageTag :image="img" className="" />
        </template>
      </BCarouselSlide>
    </BCarousel>
  </BModal>
</template>

<style scoped>
:deep(.carousel-inner) {
  width: 100%;
  height: 100%;
}
:deep(.carousel-item) {
  background-color: transparent !important;
}
:deep(.wrapper) {
  background-color: red;
}
</style>
