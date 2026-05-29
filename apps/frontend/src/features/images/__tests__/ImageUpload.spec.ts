import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: vi.fn().mockReturnValue(false) }))

vi.mock('@/assets/icons/files/avatar-upload.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/ErrorComponent.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../components/UploadButton.vue', () => ({ default: { template: '<input />' } }))

import ImageUpload from '../components/ImageUpload.vue'
import type { GalleryStore } from '../stores/galleryStore'

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
    expect(store.upload).toHaveBeenCalledWith(file, '')
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
})
