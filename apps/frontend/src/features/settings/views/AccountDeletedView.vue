<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AuthLayout from '@/features/auth/components/AuthLayout.vue'
import { useUserStore } from '@/store/userStore'
import {
  ACCOUNT_DELETION_COMMENT_MAX_LENGTH,
  type AccountDeletionFeedbackPayload,
} from '@zod/user/user.dto'

const { t } = useI18n()
const userStore = useUserStore()

const reasons = computed<{ value: AccountDeletionFeedbackPayload['reason']; label: string }[]>(
  () => [
    { value: 'found_connection', label: t('account_deleted.reason_found_connection') },
    { value: 'not_a_good_fit', label: t('account_deleted.reason_not_a_good_fit') },
    { value: 'bad_experience', label: t('account_deleted.reason_bad_experience') },
    { value: 'other', label: t('account_deleted.reason_other') },
  ]
)

const selected = ref<AccountDeletionFeedbackPayload['reason'] | null>(null)
const comment = ref('')
const submitting = ref(false)
const submitted = ref(false)
const failed = ref(false)

// Every choice but "other" submits as soon as it is picked.
watch(selected, (reason) => {
  if (reason && reason !== 'other') submit({ reason })
})

async function submit(payload: AccountDeletionFeedbackPayload) {
  submitting.value = true
  failed.value = false
  const res = await userStore.submitAccountDeletionFeedback(payload)
  submitting.value = false
  if (res.success) {
    submitted.value = true
    return
  }
  failed.value = true
  // Clear the choice so that picking it again retries.
  if (payload.reason !== 'other') selected.value = null
}

function submitComment() {
  if (submitting.value || !comment.value.trim()) return
  submit({ reason: 'other', comment: comment.value })
}
</script>

<template>
  <AuthLayout>
    <div class="py-4 account-deleted-view">
      <p
        v-if="submitted"
        class="fs-5 text-center mb-0"
        data-testid="thank-you"
      >
        {{ t('account_deleted.thank_you') }}
      </p>

      <form
        v-else
        @submit.prevent="submitComment"
      >
        <p class="mb-4">{{ t('account_deleted.message') }}</p>

        <BFormRadio
          v-for="reason in reasons"
          :id="`account-deleted-reason-${reason.value}`"
          :key="reason.value"
          v-model="selected"
          name="account-deleted-reason"
          class="mb-2"
          :value="reason.value"
          :disabled="submitting"
        >
          {{ reason.label }}
        </BFormRadio>

        <template v-if="selected === 'other'">
          <BFormTextarea
            v-model="comment"
            class="mt-3"
            rows="4"
            :aria-label="t('account_deleted.comment_label')"
            :placeholder="t('account_deleted.comment_label')"
            :maxlength="ACCOUNT_DELETION_COMMENT_MAX_LENGTH"
            :disabled="submitting"
          />
          <BButton
            type="submit"
            variant="primary"
            class="mt-3"
            :disabled="submitting || !comment.trim()"
          >
            {{ t('account_deleted.submit_button') }}
          </BButton>
        </template>

        <BAlert
          :model-value="failed"
          variant="danger"
          class="mt-3 mb-0"
        >
          {{ t('account_deleted.submit_error') }}
        </BAlert>
      </form>
    </div>
  </AuthLayout>
</template>

<style scoped>
.account-deleted-view {
  max-width: 420px;
}
</style>
