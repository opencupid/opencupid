<script setup lang="ts">
import IconCross from '@/assets/icons/interface/cross.svg'

/**
 * Full-screen, chrome-less modal for viewing photos. The default slot holds
 * the content: a single image or a carousel. Size images with `fitted-image`.
 */
const show = defineModel<boolean>({ required: true })
</script>

<template>
  <BModal
    v-model="show"
    centered
    modal-class="fullscreen-image-modal"
    :no-close-on-backdrop="false"
    :no-footer="true"
    :no-header="false"
    :no-title="true"
    :title-visually-hidden="true"
    :body-scrolling="false"
    :fullscreen="true"
    :lazy="true"
    no-animation
  >
    <template #header-close>
      <IconCross class="svg-icon" />
    </template>
    <slot />
  </BModal>
</template>

<style lang="scss">
.modal.fullscreen-image-modal {
  .fitted-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
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
</style>
