<script setup lang="ts">
import IconArrowSingleLeft from '@/assets/icons/arrows/arrow-single-left.svg'
import IconMenuDotsVert from '@/assets/icons/interface/menu-dots-vert.svg'

defineEmits<{
  (e: 'intent:back'): void
  (e: 'intent:block'): void
}>()
</script>

<template>
  <div class="d-flex justify-content-end align-items-center w-100">
    <ul class="nav nav-pills w-100 d-flex align-items-center">
      <li class="col-2">
        <a class="btn btn-secondary-outline" @click="$emit('intent:back')">
          <IconArrowSingleLeft class="svg-icon" />
        </a>
      </li>

      <li class="col-8 d-flex nav-item justify-content-center align-items-center"></li>

      <li class="col-2 d-flex justify-content-end">
        <a class="btn btn-secondary-outline" @click="$emit('intent:block')">
          <IconMenuDotsVert class="svg-icon-lg fs-4" />
        </a>
      </li>
    </ul>
  </div>
</template>
