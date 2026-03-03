# OptInCheckboxes Refactor Implementation Plan

>

**Goal:** Extract the three opt-in checkboxes from `Settings.vue` into a self-contained `OptInCheckboxes.vue` component and embed it in the onboarding finish screen.

**Architecture:** Create `OptInCheckboxes.vue` in the settings components folder. It owns the save logic for callable and newsletter checkboxes, and embeds the existing `PushPermissions` component. `Settings.vue` and `Onboarding.vue` simply drop in `<OptInCheckboxes />`.

**Tech Stack:** Vue 3 `<script setup>`, Pinia stores (`useAuthStore`, `useOwnerProfileStore`), Vue-i18n, Bootstrap 5 form-check markup, Vitest + Vue Test Utils.

---

### Task 1: Create `OptInCheckboxes.vue`

**Files:**
- Create: `apps/frontend/src/features/settings/components/OptInCheckboxes.vue`

**Step 1: Write the component**

```vue
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import PushPermissions from './PushPermissions.vue'
import type { SettingsUser } from '@zod/user/user.dto'

const props = defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const ownerProfileStore = useOwnerProfileStore()

const isSaving = ref(false)
const user = reactive({} as SettingsUser)

onMounted(async () => {
  const res = await authStore.fetchUser()
  if (res.success) {
    Object.assign(user, res.user)
  }
})

async function handleCallableChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const newValue = checkbox.checked
  isSaving.value = true
  try {
    if (ownerProfileStore.profile) {
      ownerProfileStore.profile.isCallable = newValue
    }
    const res = await ownerProfileStore.persistOwnerProfile()
    if (!res.success) {
      checkbox.checked = !newValue
    }
  } catch {
    checkbox.checked = !newValue
  } finally {
    isSaving.value = false
  }
}

async function handleNewsletterOptInChange(event: Event) {
  const checkbox = event.target as HTMLInputElement
  const newValue = checkbox.checked
  isSaving.value = true
  try {
    const res = await authStore.updateUser({ newsletterOptIn: newValue })
    if (res.success) {
      user.newsletterOptIn = newValue
    } else {
      checkbox.checked = !newValue
      console.error('Failed to update newsletter preference:', res.message)
    }
  } catch (error) {
    checkbox.checked = !newValue
    console.error('Failed to update newsletter preference:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <fieldset class="mb-3">
    <PushPermissions v-model="user.isPushNotificationEnabled" />
  </fieldset>

  <fieldset class="mb-3">
    <div class="form-check">
      <input
        id="callable-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="ownerProfileStore.profile?.isCallable ?? true"
        :disabled="disabled || isSaving"
        @change="handleCallableChange"
      />
      <label
        class="form-check-label"
        for="callable-opt-in"
      >
        {{ t('calls.open_to_calls_setting') }}
      </label>
    </div>
  </fieldset>

  <fieldset class="mb-3">
    <div class="form-check">
      <input
        id="newsletter-opt-in"
        type="checkbox"
        class="form-check-input"
        :checked="user.newsletterOptIn"
        :disabled="disabled || isSaving"
        @change="handleNewsletterOptInChange"
      />
      <label
        class="form-check-label"
        for="newsletter-opt-in"
      >
        {{ t('settings.newsletter_opt_in') }}
      </label>
    </div>
  </fieldset>
</template>
```

**Step 2: Verify it compiles**

```bash
pnpm type-check
```

Expected: no new errors for this file.

---

### Task 2: Write tests for `OptInCheckboxes.vue`

**Files:**
- Create: `apps/frontend/src/features/settings/components/__tests__/OptInCheckboxes.spec.ts`

**Step 1: Write the failing tests**

```ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// PushPermissions is a child — stub it out so its side-effects don't run
vi.mock('../PushPermissions.vue', () => ({
  default: { template: '<div data-testid="push-permissions" />' },
}))

import OptInCheckboxes from '../OptInCheckboxes.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useAuthStore } from '@/features/auth/stores/authStore'

function mountComponent(overrides: Record<string, any> = {}) {
  return mount(OptInCheckboxes, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            ownerProfile: {
              profile: { isCallable: true, ...overrides.profile },
            },
          },
        }),
      ],
    },
    props: overrides.props,
  })
}

describe('OptInCheckboxes', () => {
  describe('callable checkbox', () => {
    it('calls persistOwnerProfile when toggled', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.persistOwnerProfile = vi.fn().mockResolvedValue({ success: true })

      const checkbox = wrapper.find('#callable-opt-in')
      ;(checkbox.element as HTMLInputElement).checked = false
      await checkbox.trigger('change')
      await Promise.resolve()

      expect(store.persistOwnerProfile).toHaveBeenCalled()
    })

    it('reverts checkbox on failure', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.persistOwnerProfile = vi.fn().mockResolvedValue({ success: false })

      const checkbox = wrapper.find('#callable-opt-in')
      const input = checkbox.element as HTMLInputElement
      input.checked = false
      await checkbox.trigger('change')
      await Promise.resolve()
      await Promise.resolve()

      expect(input.checked).toBe(true)
    })
  })

  describe('newsletter checkbox', () => {
    it('calls authStore.updateUser when toggled', async () => {
      const wrapper = mountComponent()
      const store = useAuthStore()
      store.updateUser = vi.fn().mockResolvedValue({ success: true, user: {} })

      const checkbox = wrapper.find('#newsletter-opt-in')
      ;(checkbox.element as HTMLInputElement).checked = true
      await checkbox.trigger('change')
      await Promise.resolve()

      expect(store.updateUser).toHaveBeenCalledWith({ newsletterOptIn: true })
    })

    it('reverts checkbox on failure', async () => {
      const wrapper = mountComponent()
      const store = useAuthStore()
      store.updateUser = vi.fn().mockResolvedValue({ success: false, message: 'err' })

      const checkbox = wrapper.find('#newsletter-opt-in')
      const input = checkbox.element as HTMLInputElement
      input.checked = true
      await checkbox.trigger('change')
      await Promise.resolve()
      await Promise.resolve()

      expect(input.checked).toBe(false)
    })
  })

  describe('disabled prop', () => {
    it('forwards disabled prop to checkboxes', () => {
      const wrapper = mountComponent({ props: { disabled: true } })
      const callable = wrapper.find('#callable-opt-in').element as HTMLInputElement
      const newsletter = wrapper.find('#newsletter-opt-in').element as HTMLInputElement
      expect(callable.disabled).toBe(true)
      expect(newsletter.disabled).toBe(true)
    })
  })
})
```

**Step 2: Run tests to verify they fail as expected**

```bash
pnpm --filter frontend exec vitest run apps/frontend/src/features/settings/components/__tests__/OptInCheckboxes.spec.ts
```

Expected: Tests fail because the component doesn't exist yet (it does after Task 1), or fail with assertion mismatches — that's fine at this stage.

**Step 3: Run tests again after Task 1 component is already written**

```bash
pnpm --filter frontend exec vitest run apps/frontend/src/features/settings/components/__tests__/OptInCheckboxes.spec.ts
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add apps/frontend/src/features/settings/components/OptInCheckboxes.vue \
        apps/frontend/src/features/settings/components/__tests__/OptInCheckboxes.spec.ts
git commit -m "feat: extract OptInCheckboxes component (#916)"
```

---

### Task 3: Simplify `Settings.vue`

**Files:**
- Modify: `apps/frontend/src/features/settings/views/Settings.vue`

**Step 1: Replace the three fieldsets and their handlers**

In `<script setup>`:
1. Remove `handleCallableChange` function (lines 74–92)
2. Remove `handleNewsletterOptInChange` function (lines 94–115)
3. Remove the `isSaving` ref (line 35) — it is no longer used
4. Add import: `import OptInCheckboxes from '../components/OptInCheckboxes.vue'`
5. Remove import of `PushPermissions` (it's now used inside `OptInCheckboxes`)

In `<template>`:
1. Remove the three `<fieldset>` blocks for `PushPermissions`, callable, and newsletter
2. Replace with `<OptInCheckboxes />`

The result section of the template should look like:

```vue
<fieldset class="mb-3">
  <legend for="language-selector" class="h5">
    {{ t('settings.language_label') }}
  </legend>
  <LanguageSelectorDropdown size="md" />
</fieldset>

<OptInCheckboxes />
```

**Step 2: Run the full frontend test suite**

```bash
pnpm --filter frontend test
```

Expected: All tests pass.

**Step 3: Type-check**

```bash
pnpm type-check
```

Expected: No errors.

**Step 4: Commit**

```bash
git add apps/frontend/src/features/settings/views/Settings.vue
git commit -m "refactor: use OptInCheckboxes in Settings (#916)"
```

---

### Task 4: Add `OptInCheckboxes` to onboarding finish screen

**Files:**
- Modify: `apps/frontend/src/features/onboarding/views/Onboarding.vue`

**Step 1: Add the component**

In `<script setup>`, add:
```ts
import OptInCheckboxes from '@/features/settings/components/OptInCheckboxes.vue'
```

In `<template>`, inside the finish screen `v-else` block, add `<OptInCheckboxes />` between the confirmation heading block and the CTAs block. The result should look like:

```vue
<div class="animate__animated animate__fadeIn">
  <!-- finish screen: horizontal on lg+, vertical on smaller screens -->
  <div class="d-flex flex-column flex-lg-row align-items-center gap-4 gap-lg-5">
    <!-- Left: icon + heading -->
    <div class="d-flex flex-column align-items-center justify-content-center text-success flex-shrink-0">
      <IconOkHand style="width: 5rem; height: 5rem" class="svg-icon opacity-25 mb-2" />
      <h2 class="mb-0">{{ t('onboarding.confirmation.title') }}</h2>
    </div>

    <!-- Vertical divider, visible only on lg+ -->
    <div class="d-none d-lg-block border-start" style="height: 8rem; align-self: center"></div>

    <!-- Right: opt-ins + CTAs -->
    <div v-if="!profileStore.isLoading" class="d-flex flex-column gap-3 flex-grow-1 w-100">

      <OptInCheckboxes />

      <!-- Browse CTA -->
      <div class="d-flex flex-column align-items-center align-items-lg-start gap-2">
        ...
      </div>

      <!-- Profile CTA -->
      <div class="d-flex flex-column align-items-center align-items-lg-start gap-2">
        ...
      </div>
    </div>
  </div>
</div>
```

**Step 2: Run the full frontend test suite**

```bash
pnpm --filter frontend test
```

Expected: All tests pass.

**Step 3: Type-check**

```bash
pnpm type-check
```

Expected: No errors.

**Step 4: Commit**

```bash
git add apps/frontend/src/features/onboarding/views/Onboarding.vue
git commit -m "feat: show OptInCheckboxes on onboarding finish screen (#916)"
```

---

### Task 5: Final verification and PR

**Step 1: Run full CI test suite locally**

```bash
pnpm run ci:test
```

Expected: All checks pass (lint, type-check, build, tests, i18n).

**Step 2: Create changeset**

```bash
cat > .changeset/opt-in-checkboxes-onboarding.md << 'EOF'
---
'@opencupid/frontend': minor
---

Extract opt-in checkboxes into shared OptInCheckboxes component and add to onboarding finish screen (#916)
EOF
```

**Step 3: Push and open PR**

```bash
git add .changeset/opt-in-checkboxes-onboarding.md
git commit -m "chore: add changeset for #916"
git push -u origin feat/opt-in-checkboxes-916
gh pr create --title "feat: extract OptInCheckboxes component and add to onboarding (#916)" \
  --body "$(cat <<'EOF'
## Summary

- Extracts callable and newsletter opt-in checkboxes from `Settings.vue` into a new self-contained `OptInCheckboxes.vue` component
- `OptInCheckboxes` embeds the existing `PushPermissions` component and owns all save logic
- `Settings.vue` is simplified to a single `<OptInCheckboxes />` drop-in
- `Onboarding.vue` finish screen now shows the three opt-in checkboxes so new users can set preferences immediately

Closes #916

## Test plan
- [ ] Settings page renders identically to before
- [ ] All three checkboxes save correctly from settings page
- [ ] Onboarding finish screen shows the three checkboxes
- [ ] All three checkboxes save correctly from onboarding finish screen
- [ ] All existing tests pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Watch CI in background**

```bash
gh run list --limit 1
gh run watch --exit-status
```
