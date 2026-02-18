---
name: add-i18n-key
description: Add a new i18n translation key to the shared en.json following project conventions. Use when a component needs a new user-facing string. Checks for duplicates, assigns the right namespace, and reminds about translation scripts.
---

# Add i18n Key

## 1. Check for an existing key first
Search before adding — the string might already exist:
```bash
grep -r "your phrase" packages/shared/i18n/en.json
```
Also check related namespaces (e.g. if adding a button title, check if a label key already covers it).

## 2. Choose the right namespace
Keys are feature-scoped. Match the component's feature folder:

| Feature folder | Namespace |
|----------------|-----------|
| `auth/` | `authentication` |
| `messaging/` | `messaging` |
| `messaging/` voice sub-feature | `messaging.voice` |
| `interaction/` | `interactions` |
| `images/` | `profiles.image_editor` |
| `publicprofile/`, `myprofile/` | `profiles` |
| `onboarding/` | `onboarding` |
| `shared/ui/` | `uicomponents` |
| `posts/` | `posts` |
| `settings/` | `settings` |
| `browse/` | `profiles.browse` |

## 3. Name the key
Use snake_case. Be descriptive about the element and its purpose:
- ✅ `delete_button_title`, `send_message_button`, `back_button_title`
- ❌ `btn1`, `text`, `label`

For tooltips/titles: suffix with `_title`
For button labels: suffix with `_button`
For error messages: suffix with `_error`
For placeholders: suffix with `_placeholder`

## 4. Add to `packages/shared/i18n/en.json`
- Insert within the correct namespace object
- Keep keys in alphabetical order within the object
- Use plain English values (the DeepL scripts handle other languages)

Example:
```json
"interactions": {
  "like_button_title": "Like",
  "message_button_title": "Message",
  "pass_button_title": "Pass"
}
```

## 5. Use in the component
Composition API (preferred when `useI18n` is already imported):
```vue
:title="t('interactions.like_button_title')"
```

Template global (simple components without script setup i18n):
```vue
:title="$t('interactions.like_button_title')"
```

## 6. Remind about translations
Other locale files live in `packages/shared/i18n/`. To propagate the new English key to all other languages, run:
```bash
pnpm translate:icu
```
This requires `DEEPL_API_KEY` to be set. If unavailable, leave a comment in the PR noting the key needs translation.
