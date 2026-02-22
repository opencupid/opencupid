<script setup lang="ts">
const show = defineModel<boolean>()

defineProps<{
  profile: {
    publicName: string
    id: string
  }
  loading: boolean
}>()

defineEmits<{
  (e: 'blocked', profileId: string): void
  (e: 'block'): void
}>()
</script>

<template>
  <BModal
    size="md"
    centered
    button-size="md"
    :show="show"
    :focus="false"
    :busy="loading"
    :no-header="false"
    :title="$t('profiles.blocklist.dialog_title', { name: profile.publicName })"
    :ok-title="$t('profiles.blocklist.confirmation_yes')"
    :cancel-title="$t('profiles.blocklist.confirmation_no')"
    ok-variant="danger"
    cancel-variant="link"
    cancel-class="link-secondary"
    header-variant="danger"
    @ok.prevent="$emit('block')"
    @cancel="show = false"
    @hidden="show = false"
    initial-animation
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
  >
    <BOverlay
      :show="loading"
      class="w-100 h-100"
    >
      <p>
        <!--  If this person is bothering you, you can block them. This will prevent them from sending you
        messages or interacting with your profile. They will also not be shown to you anywhere on
        this site, as if they never existed. -->
        {{ $t('profiles.blocklist.dialog_message_1') }}
      </p>

      <p>
        <!-- They will not receive any notification that you have blocked them. -->
        {{ $t('profiles.blocklist.dialog_message_2') }}
      </p>
    </BOverlay>
  </BModal>
</template>
