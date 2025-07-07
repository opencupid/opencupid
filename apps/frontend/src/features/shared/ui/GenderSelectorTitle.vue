<script setup lang="ts">
import GenderSymbol from '@/features/shared/profiledisplay/GenderSymbol.vue'
</script>

<template>
  <div class="gender-icons-title d-flex w-100 justify-content-center align-items-center">
    <GenderSymbol gender="female" />
    <GenderSymbol gender="male" />
    <GenderSymbol gender="transfeminine" />
    <GenderSymbol gender="bigender" />
    <GenderSymbol gender="trans_man" />
    <GenderSymbol gender="non_binary" />
  </div>
</template>
<style >
.gender-icons-title {
  display: flex;
  gap: 0.5rem;
	height: 2rem;
}
.gender-icons-title .icon-wrapper {
  width: 2rem;
  height: 2rem;
}
.gender-icons-title .icon-wrapper .svg-icon {
  width: 100%;
  height: 100%;
}
</style>
