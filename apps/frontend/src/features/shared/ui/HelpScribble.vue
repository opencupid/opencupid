<script setup lang="ts">
import IconArrowUp from '@/assets/icons/arrows/arrow-up.svg'
import IconArrowDown from '@/assets/icons/arrows/arrow-down.svg'
import IconArrowRight from '@/assets/icons/arrows/arrow-right.svg'
import IconArrowLeft from '@/assets/icons/arrows/arrow-left.svg'
import IconArrowNe from '@/assets/icons/arrows/arrow-ne.svg'
import IconArrowNw from '@/assets/icons/arrows/arrow-nw.svg'
import IconArrowSe from '@/assets/icons/arrows/arrow-se.svg'
import IconArrowSw from '@/assets/icons/arrows/arrow-sw.svg'

defineProps<{
  text: string
  direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
}>()

const icons = {
  n: IconArrowUp,
  s: IconArrowDown,
  e: IconArrowRight,
  w: IconArrowLeft,
  ne: IconArrowNe,
  nw: IconArrowNw,
  se: IconArrowSe,
  sw: IconArrowSw,
}
</script>

<template>
  <div class="help-scribble d-flex" :class="`direction-${direction}`">
    <component :is="icons[direction]" class="svg-icon animate__animated animate__swing" />
    <span class="animate__animated animate__tada">{{ text }}</span>
  </div>
</template>

<style scoped>
@import '@fontsource/caveat'; 

.help-scribble {
  font-family: 'Caveat', cursive;
  font-size: 2rem;
  color: var(--bs-warning);
}

:deep(.svg-icon) {
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.5rem;
}

/* Cardinal directions */
.direction-n {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.direction-s {
  flex-direction: column-reverse;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.direction-e {
  flex-direction: row-reverse;
  align-items: center;
}
.direction-w {
  flex-direction: row;
  align-items: center;
}

/* Diagonal directions */
.direction-ne {
  flex-direction: column;
  align-items: flex-end;
}
.direction-nw {
  flex-direction: column;
  align-items: flex-start;
}
.direction-se {
  flex-direction: column-reverse;
  align-items: flex-end;
}
.direction-sw {
  flex-direction: column-reverse;
  align-items: flex-start;
}
</style>
