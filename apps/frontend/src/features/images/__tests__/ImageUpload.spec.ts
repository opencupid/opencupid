import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: vi.fn().mockReturnValue(false) }))

vi.mock('@/assets/icons/files/avatar-upload.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/ErrorComponent.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../components/UploadButton.vue', () => ({ default: { template: '<input />' } }))

import ImageUpload from '../components/ImageUpload.vue'
import type { GalleryRestriction, GalleryStore } from '../stores/galleryStore'

const restriction: GalleryRestriction = {
  labelKey: 'restrict.label',
  hintKey: 'restrict.hint',
  titleKey: 'restrict.title',
  inactiveTitleKey: 'restrict.inactive',
  isActive: true,
  isRestricted: () => false,
}

function makeStubStore(overrides: Partial<GalleryStore> = {}): GalleryStore {
  return {
    images: [],
    isLoading: false,
    load: vi.fn().mockResolvedValue({ success: true }),
    upload: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    reorder: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  }
}

const mountStubs = {
  BModal: true,
  BButton: { template: '<button></button>' },
  FormKit: true,
}

function stubFileReader() {
  const orig = window.FileReader
  ;(window as any).FileReader = class {
    result: string | ArrayBuffer | null = null
    onload: any = null
    readAsDataURL() {
      this.result = 'data:'
      this.onload?.()
    }
  }
  return () => {
    window.FileReader = orig
  }
}

describe('ImageUpload', () => {
  it('opens modal and sets previewUrl on file change (preview default)', async () => {
    const wrapper = mount(ImageUpload, {
      props: { store: makeStubStore() },
      global: { stubs: mountStubs },
    })
    const file = new File(['a'], 'a.png', { type: 'image/png' })
    const restore = stubFileReader()
    await (wrapper.vm as any).handleFileChange({ target: { files: [file] } } as any)
    restore()
    expect((wrapper.vm as any).previewUrl).not.toBeNull()
    expect((wrapper.vm as any).showModal).toBe(true)
  })

  it('uploads immediately and skips the preview modal when preview is false', async () => {
    const store = makeStubStore()
    const wrapper = mount(ImageUpload, {
      props: { store, preview: false },
      global: { stubs: mountStubs },
    })
    const file = new File(['a'], 'a.png', { type: 'image/png' })
    await (wrapper.vm as any).handleFileChange({ target: { files: [file] } } as any)
    expect(store.upload).toHaveBeenCalledWith(file, '', { isRestricted: false })
    expect((wrapper.vm as any).showModal).toBe(false)
  })

  it('resets the file input (bumps uploadButtonKey) after a successful upload', async () => {
    const store = makeStubStore()
    const wrapper = mount(ImageUpload, {
      props: { store, preview: false },
      global: { stubs: mountStubs },
    })
    const before = (wrapper.vm as any).uploadButtonKey
    const file = new File(['a'], 'a.png', { type: 'image/png' })
    await (wrapper.vm as any).handleFileChange({ target: { files: [file] } } as any)
    expect((wrapper.vm as any).uploadButtonKey).toBe(before + 1)
  })

  it('applies the caller-supplied buttonClass verbatim, without fill classes', () => {
    const wrapper = mount(ImageUpload, {
      props: { store: makeStubStore(), buttonClass: 'btn btn-secondary btn-rounded' },
      global: { stubs: mountStubs },
    })
    const button = wrapper.find('.image-upload > *')
    expect(button.classes()).toEqual(
      expect.arrayContaining(['btn', 'btn-secondary', 'btn-rounded'])
    )
    expect(button.classes()).not.toContain('w-100')
    expect(button.classes()).not.toContain('h-100')
  })

  it('fills its container when the caller supplies no buttonClass', () => {
    const wrapper = mount(ImageUpload, {
      props: { store: makeStubStore() },
      global: { stubs: mountStubs },
    })
    const button = wrapper.find('.image-upload > *')
    expect(button.classes()).toEqual(expect.arrayContaining(['w-100', 'h-100']))
  })

  // AttachImageButton forwards its own optional prop, so undefined reaches us
  // explicitly and must still resolve to the fill default.
  it('fills its container when buttonClass is passed as undefined', () => {
    const wrapper = mount(ImageUpload, {
      props: { store: makeStubStore(), buttonClass: undefined },
      global: { stubs: mountStubs },
    })
    const button = wrapper.find('.image-upload > *')
    expect(button.classes()).toEqual(expect.arrayContaining(['w-100', 'h-100']))
  })

  describe('restriction checkbox', () => {
    const stubs = { ...mountStubs, BModal: { template: '<div><slot /></div>' } }
    const openPreview = async (store: GalleryStore) => {
      const wrapper = mount(ImageUpload, { props: { store }, global: { stubs } })
      const restore = stubFileReader()
      await (wrapper.vm as any).handleFileChange({
        target: { files: [new File(['a'], 'a.png', { type: 'image/png' })] },
      } as any)
      restore()
      return wrapper
    }

    it('is offered only by galleries that define a restriction', async () => {
      const plain = await openPreview(makeStubStore())
      expect(plain.find('[data-testid="image-upload-restrict"]').exists()).toBe(false)

      const restricted = await openPreview(makeStubStore({ restriction }))
      expect(restricted.find('[data-testid="image-upload-restrict"]').exists()).toBe(true)
      expect(restricted.text()).toContain('restrict.label')
      expect(restricted.text()).toContain('restrict.hint')
    })

    it('passes the ticked value to upload and resets it when the dialog closes', async () => {
      const store = makeStubStore({ restriction })
      const wrapper = await openPreview(store)
      ;(wrapper.vm as any).isRestricted = true
      await (wrapper.vm as any).handleUpload()
      expect(store.upload).toHaveBeenCalledWith(expect.any(File), '', { isRestricted: true })
      ;(wrapper.vm as any).onModalHidden()
      expect((wrapper.vm as any).isRestricted).toBe(false)
    })
  })
})
