<script setup lang="ts">
import EmailTemplate from '@backend/services/email/EmailTemplate.vue'
</script>
<template>
  <div>
    <EmailTemplate
      publicName="John Doe"
      contentBody="We received a request to reset your password. Click the button below to proceed."
      callToActionUrl="https://example.com/reset-password?token=abc123"
      callToActionLabel="Reset Password"
    >
    </EmailTemplate>
  </div>
</template>
