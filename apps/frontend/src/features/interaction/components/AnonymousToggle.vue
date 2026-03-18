<script lang="ts" setup>
const selectedAnonymous = defineModel<boolean>({ required: true })

const emit = defineEmits<{
  (e: 'change', isAnonymous: boolean): void
}>()
</script>

<template>
  <BFormRadioGroup
    v-model="selectedAnonymous"
    stacked
  >
    <BFormRadio
      name="anonymous-toggle"
      :value="true"
      @change="emit('change', true)"
    >
      {{ $t('interactions.anonymous_toggle_anonymous') }}
    </BFormRadio>
    <BFormRadio
      name="anonymous-toggle"
      :value="false"
      @change="emit('change', false)"
    >
      {{ $t('interactions.anonymous_toggle_reveal') }}
    </BFormRadio>
  </BFormRadioGroup>
  <div v-if="selectedAnonymous">
    {{ $t('interactions.anonymous_like_explanation') }}
  </div>
  <div v-else>
    {{ $t('interactions.revealed_like_explanation') }}
  </div>
</template>
