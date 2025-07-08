<script lang="ts" setup>
import { ref } from 'vue'
import { useI18nStore } from '@/store/i18nStore'

import IconHeart from '@/assets/icons/interface/heart.svg'
import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import Logo from '@/assets/icons/app/logo.svg'

// @ts-ignore sdf
import { faGithub } from '@fortawesome/free-brands-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import LanguageSelectorDropdown from '@/features/shared/ui/LanguageSelectorDropdown.vue'

const i18nStore = useI18nStore()

const loading = ref(false)

async function enterApp() {
  loading.value = true
  const { bootstrapApp } = await import('../../../app')
  await bootstrapApp()
}

const handleSetLanguage = (lang: string) => {
  i18nStore.setLanguage(lang)
}
</script>

<template>
  <div style="min-height: 100vh;" class="bg-light">
    <header class="my-3 my-md-5">
      <BContainer fluid="md" class="d-flex flex-column justify-content-between ">
        <BRow>
          <BCol sm="12" md="6" class="d-flex justify-content-center align-items-center mx-auto">
            <div class="flex-grow-1">
              <LanguageSelectorDropdown
                size="sm"
                @language:select="(lang: string) => handleSetLanguage(lang)"
              />
            </div>
            <div class="flex-shrink-1 flex-grow-0 ms-2 opacity-50">
              <IconGlobe class="svg-icon svg-icon-lg me-2" />
            </div>
          </BCol>
        </BRow>
      </BContainer>
    </header>

    <main class="fs-3 overflow-auto hide-scrollbar pb-5 position-relative" style="padding-bottom: 10rem">
      <BContainer>
        <div class="text-success w-100 d-flex align-items-center flex-column mb-3 mb-lg-4">
          <Logo class="svg-icon-100 logo text-success" style="width: 6rem" />
        </div>
        <BRow>
          <BCol md="12">
            <h1 class="text-center mb-3 mb-lg-4">
              <span class="d-none d-md-inline-block"> Welcome to </span>
              Gaians.net
            </h1>
            <div class="my-md-3">
              This is a meeting point in the online realm for us to find each other and connect.
            </div>
          </BCol>
        </BRow>
        <BRow class="fs-4">
          <BCol md="6">
            <div class="d-flex flex-column align-items-center p-3">
              <div class="icon-wrapper text-social mb-lg-3">
                <IconSocialize class="svg-icon-100" />
              </div>
              <div>
                Exchange ideas, connect on our travels, find like-minded souls nearby to hang out
                with
              </div>
            </div>
          </BCol>
          <BCol md="6">
            <div class="d-flex flex-column align-items-center p-3">
              <div class="icon-wrapper text-dating mb-lg-3">
                <IconDate class="svg-icon-100" />
              </div>
              <div>Find a soulmate or playmate</div>
            </div>
          </BCol>
        </BRow>

        <div class="w-100 text-center text-muted" style="font-size: 1rem; margin-bottom:8rem;">
          <div>
            Made by gaians with
            <span class="text-danger">
              <IconHeart class="svg-icon" />
            </span>
          </div>
          <div>
            Anyone can contribute on
            <a
              href="https://github.com/opencupid/opencupid"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon :icon="faGithub" class="text-decoration-none text-muted" />
            </a>
          </div>
        </div>
      </BContainer>
    </main>

    <footer class="position-fixed start-0 bottom-0 w-100 text-center">
      <BButton
        variant="success"
        @click="enterApp"
        :disabled="loading"
        size="lg"
        class="px-5 mb-3"
        pill
      >
        {{ loading ? 'Loading...' : 'Enter' }}
      </BButton>
    </footer>
  </div>
</template>

<style lang="scss">
@import '@/css/landing.scss';

.icon-wrapper {
  height: 5rem;
  @include media-breakpoint-up(md) {
    height: 8rem;
  }
}
footer {
  line-height: 1;
}
</style>
