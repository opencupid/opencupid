<script setup lang="ts">

const show = defineModel<boolean>()

defineProps<{
  profile: {
    publicName: string
    id: string
  },
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
    :backdrop="'static'"
    centered
    button-size="md"
    :show="show"
    :focus="false"
    :busy="loading"
    :no-close-on-backdrop="true"
    :no-header="false"
    :title="`Block ${profile.publicName}`"
    :ok-title="`Block ${profile.publicName}`"
    :ok-variant="'danger'"
    header-variant="danger"
    @ok.prevent="$emit('block')"
		@cancel="show = false"
    cancel-title="Nevermind"
    initial-animation
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
    :keyboard="false"
  >
    <BOverlay :show="loading" class="w-100 h-100">
      <p>
        If this person is bothering you, you can block them. This will prevent them from sending you
        messages or interacting with your profile. They will also not be shown to you anywhere on
        this site, as if they never existed.
      </p>

      <p>They will not receive any notification that you have blocked them.</p>
    </BOverlay>
  </BModal>
</template>
