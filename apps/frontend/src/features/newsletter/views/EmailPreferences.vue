<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useNewsletterStore } from '../stores/newsletterStore'
import { useI18n } from 'vue-i18n'

import MiddleColumn from '@/features/shared/ui/MiddleColumn.vue'
import LoadingComponent from '@/features/shared/ui/LoadingComponent.vue'
import RouterBackButton from '@/features/shared/ui/RouterBackButton.vue'
import SecondaryNav from '@/features/shared/ui/SecondaryNav.vue'

const { t } = useI18n()
const newsletterStore = useNewsletterStore()

const isLoading = computed(() => newsletterStore.loading)
const subscription = computed(() => newsletterStore.subscription)
const isSubscribed = computed(() => newsletterStore.isSubscribed)
const canSubscribe = computed(() => newsletterStore.canSubscribe)
const statusText = computed(() => newsletterStore.statusText)
const error = computed(() => newsletterStore.error)

onMounted(async () => {
  await newsletterStore.fetchMe()
})

const handleSubscribe = async () => {
  const success = await newsletterStore.subscribe()
  if (success) {
    // You could add a toast notification here
    console.log('Successfully subscribed to newsletter')
  }
}

const handleUnsubscribe = async () => {
  const success = await newsletterStore.unsubscribe()
  if (success) {
    // You could add a toast notification here
    console.log('Successfully unsubscribed from newsletter')
  }
}

const clearError = () => {
  newsletterStore.clearError()
}
</script>

<template>
  <MiddleColumn>
    <SecondaryNav>
      <RouterBackButton />
      <h1 class="h4 mb-0 text-truncate">{{ t('newsletter.emailPreferences') }}</h1>
    </SecondaryNav>

    <div class="px-3 py-4">
      <LoadingComponent v-if="isLoading && !subscription" />
      
      <div v-else>
        <!-- Current Status Card -->
        <div class="card mb-4">
          <div class="card-body">
            <h5 class="card-title">{{ t('newsletter.currentStatus') }}</h5>
            <div class="d-flex align-items-center mb-3">
              <span 
                class="badge me-2"
                :class="{
                  'bg-success': isSubscribed,
                  'bg-secondary': !isSubscribed
                }"
              >
                {{ statusText }}
              </span>
            </div>
            
            <div v-if="subscription?.subscribedAt && isSubscribed" class="text-muted small">
              {{ t('newsletter.subscribedSince') }}: {{ new Date(subscription.subscribedAt).toLocaleDateString() }}
            </div>
            <div v-if="subscription?.unsubscribedAt && !isSubscribed" class="text-muted small">
              {{ t('newsletter.unsubscribedOn') }}: {{ new Date(subscription.unsubscribedAt).toLocaleDateString() }}
            </div>
          </div>
        </div>

        <!-- Actions Card -->
        <div class="card mb-4">
          <div class="card-body">
            <h5 class="card-title">{{ t('newsletter.manageSubscription') }}</h5>
            <p class="card-text text-muted">
              {{ t('newsletter.manageDescription') }}
            </p>
            
            <!-- Error Alert -->
            <div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
              <div class="flex-grow-1">{{ error }}</div>
              <button 
                type="button" 
                class="btn-close" 
                aria-label="Close"
                @click="clearError"
              ></button>
            </div>

            <!-- Action Buttons -->
            <div class="d-grid gap-2">
              <button
                v-if="canSubscribe"
                @click="handleSubscribe"
                :disabled="isLoading"
                class="btn btn-primary"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ t('newsletter.subscribe') }}
              </button>
              
              <button
                v-if="isSubscribed"
                @click="handleUnsubscribe"
                :disabled="isLoading"
                class="btn btn-outline-secondary"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {{ t('newsletter.unsubscribe') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Information Card -->
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{ t('newsletter.aboutNewsletters') }}</h5>
            <p class="card-text text-muted">
              {{ t('newsletter.aboutDescription') }}
            </p>
            <p class="card-text text-muted small">
              {{ t('newsletter.unsubscribeNote') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </MiddleColumn>
</template>

<style scoped>
.card {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
}

.badge {
  font-size: 0.875rem;
}

.btn-close {
  flex-shrink: 0;
}
</style>