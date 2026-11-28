import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { reactive } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/photo.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/interface/heart-filled.svg', () => ({
  default: { template: '<svg class="heart" />' },
}))

import ImageEditor from '../components/ImageEditor.vue'
import type { GalleryRestriction, GalleryStore } from '../stores/galleryStore'
import type { OwnerImage } from '@zod/image/image.dto'

const image = (id: string): OwnerImage => ({
  id,
  mimeType: 'image/jpeg',
  altText: '',
  position: 0,
  blurhash: null,
  variants: [{ size: 'card', url: `/${id}` }],
})

function mountEditor(restriction?: Partial<GalleryRestriction>) {
  const store: GalleryStore = reactive({
    images: [image('ckpublic00000000000000000'), image('ckrestricted0000000000000')],
    isLoading: false,
    restriction: restriction && {
      labelKey: 'label',
      hintKey: 'hint',
      titleKey: 'title.active',
      inactiveTitleKey: 'title.inactive',
      isActive: true,
      isRestricted: (img: OwnerImage) => img.id === 'ckrestricted0000000000000',
      ...restriction,
    },
    load: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    reorder: vi.fn().mockResolvedValue({ success: true }),
  }) as GalleryStore
  return mount(ImageEditor, {
    props: { store, minImages: 0, autoLoad: false },
    global: {
      stubs: {
        VueDraggableNext: { template: '<div><slot /></div>' },
        ImageTag: { template: '<img />' },
        ImageUpload: true,
        FontAwesomeIcon: true,
      },
    },
  })
}

describe('ImageEditor restricted images', () => {
  it('marks only restricted images, with the halo, heart and hover hint', () => {
    const wrapper = mountEditor({})
    expect(wrapper.findAll('[data-testid="restricted-image"]')).toHaveLength(1)
    const marked = wrapper.get('[data-testid="restricted-image"]')
    expect(marked.classes()).toContain('restricted')
    expect(marked.classes()).not.toContain('restricted-inactive')
    expect(marked.attributes('title')).toBe('title.active')
    expect(marked.find('.heart').exists()).toBe(true)
    expect(wrapper.findAll('.heart')).toHaveLength(1)
  })

  it('also fades them, with the inactive hint, while nobody can see them', () => {
    const wrapper = mountEditor({ isActive: false })
    const marked = wrapper.get('[data-testid="restricted-image"]')
    expect(marked.classes()).toContain('restricted-inactive')
    expect(marked.attributes('title')).toBe('title.inactive')
  })

  it('renders galleries without a restriction unchanged', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="restricted-image"]').exists()).toBe(false)
    expect(wrapper.find('.heart').exists()).toBe(false)
  })
})
