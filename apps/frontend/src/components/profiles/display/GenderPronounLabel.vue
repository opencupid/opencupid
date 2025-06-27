<script setup lang="ts">
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { useDatingFields } from '../composables/useDatingFields'
import { useI18n } from 'vue-i18n'
import EditField from '@/features/myprofile/components/EditField.vue'
import GenderSelector from '@/components/profiles/forms/GenderSelector.vue'
import PronounSelector from '../forms/PronounSelector.vue'
import GenderSymbol from './GenderSymbol.vue'
import { toRef } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const profileRef = toRef(props, 'profile')
const { age, gender, pronouns } = useDatingFields(profileRef, t)
</script>

<template>
  <div
    v-if="props.profile.scopes.includes('dating')"
    class="text-muted dating-field d-flex align-items-center"
  >
    <span class="me-1">{{ age }}</span>
    <span class="me-1 d-inline-flex align-items-center">
      <GenderSymbol v-if="gender && gender != 'unspecified'" :gender />
      <EditField fieldName="gender" :editComponent="GenderSelector">
        <template #display>
          <span class="d-inline-flex align-items-center editable-placeholder pe-4">
            <span v-if="gender !== 'unspecified'">({{ props.profile.gender }})</span>
            <span v-else class=""> gender</span>
          </span>
        </template>
      </EditField>
    </span>

    <span v-if="props.profile.pronouns && pronouns" class="d-inline-flex align-items-center">
      <span>{{ pronouns }}</span>
    </span>
    <EditField fieldName="pronouns" :editComponent="PronounSelector">
      <template #display>
        <span
          v-if="!pronouns || props.profile.pronouns === 'unspecified'"
          class="editable-placeholder"
          >{{ $t('profile.pronouns') }}
        </span>
      </template>
    </EditField>
  </div>
</template>
