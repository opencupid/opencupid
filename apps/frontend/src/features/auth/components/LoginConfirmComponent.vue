<script lang="ts" setup>
import 'animate.css'
import IconSun from '@/assets/icons/interface/sun.svg'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="login-success-component">
    <div class="d-flex justify-content-center align-items-center flex-column h-100">
      <div class="icon-inner text-success animate__animated animate__fadeIn">
        <IconSun class="svg-icon welcome-icon" />
      </div>
      <div class="text-success fs-3 animate__animated animate__fadeIn">
        {{ t('auth.login_confirm_welcome') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50vh;
  margin-bottom: 1em;
}

.welcome-icon {
  width: 10rem;
  height: 10rem;
}
</style>
