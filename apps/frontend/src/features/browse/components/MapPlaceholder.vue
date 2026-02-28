<script setup lang="ts">
withDefaults(
  defineProps<{
    isAnimated?: boolean
  }>(),
  {
    isAnimated: true,
  }
)
</script>

<template>
  <div class="map-placeholder d-flex align-items-center justify-content-center h-100">
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      class="placeholder-svg"
      :class="{ animated: isAnimated }"
    >
      <!-- Water background -->
      <rect
        width="400"
        height="300"
        fill="#e8eff6"
      />

      <!-- Abstract landmasses -->
      <path
        d="M20,80 Q60,40 120,65 Q160,80 180,50 Q220,20 260,55 Q290,75 280,110 Q270,140 230,130 Q190,120 160,145 Q130,170 80,150 Q40,135 20,100 Z"
        fill="#d4dde8"
      />
      <path
        d="M200,160 Q240,140 290,155 Q340,170 380,150 L400,155 L400,240 Q360,220 320,235 Q280,250 240,230 Q210,215 200,190 Z"
        fill="#d4dde8"
      />
      <path
        d="M0,200 Q30,180 70,195 Q110,210 130,190 Q150,170 140,210 Q130,250 90,260 Q50,270 20,255 L0,245 Z"
        fill="#d4dde8"
      />

      <!-- Roads / lines -->
      <line
        x1="80"
        y1="90"
        x2="230"
        y2="130"
        stroke="#c0c8d4"
        stroke-width="1.5"
        stroke-dasharray="4,3"
      />
      <line
        x1="240"
        y1="170"
        x2="350"
        y2="200"
        stroke="#c0c8d4"
        stroke-width="1.5"
        stroke-dasharray="4,3"
      />

      <!-- POI dots -->
      <circle
        cx="100"
        cy="85"
        r="5"
        fill="#a0b4cc"
      />
      <circle
        cx="180"
        cy="70"
        r="4"
        fill="#a0b4cc"
      />
      <circle
        cx="250"
        cy="175"
        r="5"
        fill="#a0b4cc"
      />
      <circle
        cx="310"
        cy="190"
        r="4"
        fill="#a0b4cc"
      />
      <circle
        cx="60"
        cy="220"
        r="4"
        fill="#a0b4cc"
      />
    </svg>
  </div>
</template>

<style scoped>
.map-placeholder {
  background: #e8eff6;
}

.placeholder-svg {
  width: 100%;
  height: 100%;
  opacity: 0.6;
}

.placeholder-svg.animated {
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
