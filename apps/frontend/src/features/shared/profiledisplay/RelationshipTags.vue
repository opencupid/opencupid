<script setup lang="ts">
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { useDatingFields } from '@/features/shared/composables/useDatingFields'
import { useI18n } from 'vue-i18n'

import RelationstatusSelector from '@/features/shared/profileform/RelationstatusSelector.vue'
import EditField from '@/features/myprofile/components/EditField.vue'
import HaskidsSelector from '../profileform/HaskidsSelector.vue'
import { toRef } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  profile: PublicProfileWithContext
}>()
const profileRef = toRef(props, 'profile')
const { relationshipStatus, hasKids } = useDatingFields(profileRef, t)
</script>

<template>
  <ul
    v-if="props.profile.isDatingActive"
    class="list-unstyled d-inline-flex flex-wrap align-items-center dating-field"
  >
    <li
      v-if="props.profile.relationship"
      class="d-flex align-items-center me-2"
    >
      <span class="badge text-bg-dating">{{ relationshipStatus }}</span>
      <EditField
        fieldName="relationship"
        :editComponent="RelationstatusSelector"
        class="ms-1"
      >
        <template #placeholder>
          {{}}
          <span
            v-if="props.profile.relationship === 'unspecified'"
            class="badge text-bg-dating opacity-25 me-2"
            >{{ $t('profiles.relationship_unspecified_label') }}</span
          >
        </template>
      </EditField>
    </li>
    <li
      v-if="props.profile.hasKids"
      class="d-flex align-items-center me-2"
    >
      <span class="badge text-bg-dating">{{ hasKids }}</span>
      <EditField
        fieldName="hasKids"
        :editComponent="HaskidsSelector"
        class="ms-1"
      >
        <template #placeholder>
          {{}}
          <span
            v-if="props.profile.hasKids === 'unspecified'"
            class="editable-placeholder me-2"
          >
            {{ $t('profiles.haskids_unspecified_label') }}</span
          >
        </template>
      </EditField>
    </li>
  </ul>
</template>
