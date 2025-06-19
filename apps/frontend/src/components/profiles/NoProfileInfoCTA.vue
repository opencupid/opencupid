<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const router = useRouter()
</script>

<template>
  <div>
    <h3>{{ t('profiles.no_profile_title') }}</h3>
    <button class="btn btn-primary" @click="router.push({ name: 'Onboarding' })">
      {{ t('profiles.no_profile_create') }}
    </button>
  </div>
</template>
