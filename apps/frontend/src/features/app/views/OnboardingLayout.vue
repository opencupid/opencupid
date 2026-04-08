<script setup lang="ts">
defineOptions({ name: 'OnboardingLayout' })
</script>

<template>
  <!--
    Top-level parent for /onboarding. Intentionally minimal: no drawer,
    no detail panel, no sidebar, no KeepAlive. The whole point of splitting
    this out from AuthLayout is that onboarding lives in its own layout tree,
    so navigating between /onboarding and /browse causes the other layout
    (and any cached state inside it — e.g. AppShell) to unmount cleanly.
    See the PR that introduced this file for the rationale.
  -->
  <div class="onboarding-layout vh-100 overflow-hidden">
    <RouterView />
  </div>
</template>
