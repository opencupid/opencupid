<script setup lang="ts">
import EmailTemplate from '../../backend/src/services/email/EmailTemplate.vue'
</script>
<template>
  <div>
    <EmailTemplate
      siteName="OpenCupid"
      publicName="John Doe"
      contentBody="Here is your login code: <h2>123456</h2>Or click the button below to proceed."
      callToActionUrl="https://example.org/reset-password?token=abc123"
      callToActionLabel="Reset Password"
      footer="If you didn’t request this, you can ignore this email."
    >
    </EmailTemplate>
  </div>
</template>
