<script lang="ts" setup>
import { getCurrentInstance, ref } from 'vue'
import { useI18nStore } from '@/store/i18nStore'

import IconDate from '@/assets/icons/app/cupid.svg'
import IconSocialize from '@/assets/icons/app/socialize.svg'
import IconGlobe from '@/assets/icons/interface/globe.svg'
import Logo from '@/assets/icons/app/logo.svg'

import { faGithub } from '@fortawesome/free-brands-svg-icons'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import LanguageSelectorDropdown from '@/features/shared/ui/LanguageSelectorDropdown.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const i18nStore = useI18nStore()

const loading = ref(false)

const vm = getCurrentInstance()

async function enterApp() {
  loading.value = true

  // Unmount the current LandingPage app
  console.log('Unmounting LandingPage app...', vm)
  vm?.appContext.app.unmount()
  const { bootstrapApp } = await import('../../../app')

  await bootstrapApp()
}

const handleSetLanguage = (lang: string) => {
  i18nStore.setLanguage(lang)
}

const siteName = __APP_CONFIG__.SITE_NAME || 'OpenCupid'
</script>

<template>
  <div class="lp-wrapper">
    <header
      class="position-absolute top-0 start-0 w-100 pt-2"
      style="z-index: 1000; background-color: inherit"
    >
      <BContainer
        fluid="md"
        class="d-flex flex-column justify-content-between"
      >
        <BRow>
          <BCol
            cols="12"
            sm="6"
            md="4"
            class="d-flex justify-content-center align-items-center ms-auto"
          >
            <div class="flex-grow-1">
              <LanguageSelectorDropdown
                size="sm"
                @language:select="(lang: string) => handleSetLanguage(lang)"
              />
            </div>
            <div
              class="flex-shrink-1 flex-grow-0 ms-2 opacity-50"
              :title="t('landingpage.select_language')"
            >
              <IconGlobe class="svg-icon svg-icon-lg me-2" />
            </div>
          </BCol>
        </BRow>
      </BContainer>
    </header>

    <main
      class="overflow-auto hide-scrollbar position-relative"
      style="padding-top: 4rem"
    >
      <BContainer>
        <div class="text-success w-100 d-flex align-items-center flex-column mb-3 mb-lg-4">
          <Logo
            class="svg-icon-100 logo text-success"
            style="width: 6rem"
          />
        </div>
        <BRow class="d-flex flex-column align-items-center">
          <BCol
            md="12"
            lg="8"
          >
            <h1 class="text-center mb-3 mb-lg-4">
              <span class="d-none d-md-inline-block">
                {{ t('landingpage.title_lg', { siteName: '' }).trim() }}&nbsp;<span
                  class="site-name"
                  >{{ siteName }}</span
                >
              </span>
              <span class="d-inline-block d-md-none site-name">{{ siteName }}</span>
            </h1>
            <div class="my-md-3 fs-5 lp-body-text">
              <!-- This is a meeting point in the online realm for us to find each other and connect. -->
              {{ t('landingpage.subtitle_1', { siteName: siteName }) }}
            </div>
          </BCol>
        </BRow>
        <BRow class="d-flex flex-column align-items-center fs-4">
          <BCol
            md="12"
            lg="8"
          >
            <BRow>
              <BCol md="6">
                <div class="d-flex flex-column align-items-center py-3 text-center lp-feature-card">
                  <div class="icon-wrapper mb-lg-3">
                    <div class="icon-circle">
                      <IconSocialize class="svg-icon-100 text-social" />
                    </div>
                  </div>
                  <div class="lp-feature-text">
                    <!-- Exchange ideas, connect on our travels, find like-minded souls nearby to hang out
                with -->
                    {{ t('landingpage.socialize_1') }}
                  </div>
                </div>
              </BCol>
              <BCol md="6">
                <div class="d-flex flex-column align-items-center py-3 text-center lp-feature-card">
                  <div class="icon-wrapper mb-lg-3">
                    <div class="icon-circle">
                      <IconDate class="svg-icon-100 text-dating" />
                    </div>
                  </div>
                  <div class="lp-feature-text">
                    <!-- Find a soulmate or playmate -->
                    {{ t('landingpage.date_1') }}
                  </div>
                </div>
              </BCol>
            </BRow>
          </BCol>
        </BRow>

        <div
          class="w-100 text-center text-muted mt-3"
          style="font-size: 1rem; margin-bottom: 8rem"
        >
          <div>
            <!-- Made by gaians with -->
            {{ t('landingpage.footer_madeby') }}
          </div>
          <div>
            <!-- Anyone can contribute on -->
            {{ t('landingpage.footer_contribute') }}
            <a
              href="https://github.com/opencupid/opencupid"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon
                :icon="faGithub"
                class="text-decoration-none text-muted fs-4"
              />
            </a>
          </div>
          <div>
            <a href="mailto:hello@gaians.net">hello@gaians.net</a>
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
        {{ loading ? t('landingpage.enter_button_loading') : t('landingpage.enter_button') }}
      </BButton>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.lp-wrapper {
  min-height: 100%;
  overflow: clip;
  background: radial-gradient(ellipse at 50% 40%, #faf4ea 0%, #e0c99a 55%, #c9a97a 100%);
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  &::before {
    width: 28rem;
    height: 20rem;
    bottom: -6rem;
    left: -8rem;
    background: rgba(#a43d30, 0.07);
    filter: blur(3rem);
  }

  &::after {
    width: 22rem;
    height: 18rem;
    top: -4rem;
    right: -6rem;
    background: rgba(#6b8e23, 0.08);
    filter: blur(2.5rem);
  }
}

.icon-wrapper {
  width: 5rem;
  height: 5rem;
  @include media-breakpoint-up(md) {
    width: 8rem;
    height: 8rem;
  }
}
button {
  box-shadow: 0 4px 20px rgba(#5e4b2c, 0.25);

  @include media-breakpoint-up(md) {
    font-size: 3rem;
  }
}
footer {
  line-height: 1;
  background: linear-gradient(to top, rgba(#c9a97a, 0.97) 55%, transparent);
  padding-top: 2rem;
  z-index: 1000;
}

main {
  position: relative;
  z-index: 1;
}

main::after {
  content: '';
  position: sticky;
  bottom: 0;
  display: block;
  height: 5rem;
  width: 100%;
  background: linear-gradient(to top, rgba(#c9a97a, 0.85), rgba(#c9a97a, 0));
  pointer-events: none;
}

.site-name {
  color: #5e4b2c;
  font-weight: 700;
}

.lp-body-text {
  line-height: 1.55;
  color: #2e2c26;
  white-space: pre-line;
}

.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(#b8904a, 0.18);
  box-shadow:
    0 4px 20px rgba(#5e4b2c, 0.2),
    0 1px 4px rgba(#5e4b2c, 0.12);
  padding: 0.75rem;
}

.lp-feature-text {
  font-size: $font-size-sm;
  color: map-get($theme-colors, 'secondary');
  line-height: 1.5;
  max-width: 16rem;
}
</style>
