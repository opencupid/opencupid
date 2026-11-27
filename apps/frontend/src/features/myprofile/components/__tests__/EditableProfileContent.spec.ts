import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import en from '@shared/i18n/en.json'
import EditableProfileContent from '../EditableProfileContent.vue'

const stub = vi.hoisted(() => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/photo.svg', () => stub)
vi.mock('@/features/shared/profileform/PublicNameInput.vue', () => stub)
vi.mock('@/features/shared/profileform/LocationSelector.vue', () => stub)
vi.mock('@/features/shared/profileform/LanguageSelector.vue', () => stub)
vi.mock('@/features/shared/profileform/TagSelector.vue', () => stub)
vi.mock('@/features/shared/profileform/IntrotextEditor.vue', () => stub)
vi.mock('../ProfilePhotoEditor.vue', () => stub)

// Resolve keys against the real source locale, so a key missing from en.json renders raw.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) =>
      key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en) ?? key,
  }),
}))

const mountWith = (profile: Record<string, unknown>) =>
  mount(EditableProfileContent, {
    props: { profile: profile as never },
    global: {
      stubs: {
        ProfileContent: { template: '<div class="tags-edit"><slot name="tags-edit" /></div>' },
        EditField: { template: '<div><slot name="placeholder" /></div>' },
      },
    },
  })

describe('EditableProfileContent', () => {
  it('shows a translated placeholder when the profile has no interests', () => {
    const wrapper = mountWith({ tags: [] })
    expect(wrapper.find('.tags-edit .editable-placeholder').text()).toBe(
      en.profiles.forms.tags_placeholder
    )
  })

  it('hides the placeholder when the profile has interests', () => {
    const wrapper = mountWith({ tags: [{ id: 't1', name: 'Hiking' }] })
    expect(wrapper.find('.tags-edit .editable-placeholder').exists()).toBe(false)
  })
})
