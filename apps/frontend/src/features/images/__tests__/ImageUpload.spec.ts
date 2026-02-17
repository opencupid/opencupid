import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: vi.fn().mockReturnValue(false) }))

vi.mock('@/assets/icons/files/avatar-upload.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/LoadingComponent.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/ui/ErrorComponent.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../components/UploadButton.vue', () => ({ default: { template: '<input />' } }))
vi.mock('../stores/imageStore', () => ({
  useImageStore: () => ({ uploadProfileImage: vi.fn().mockResolvedValue({ success: true }) }),
}))

import ImageUpload from '../components/ImageUpload.vue'

describe('ImageUpload', () => {
  it('opens modal and sets preview on file change', async () => {
    const wrapper = mount(ImageUpload, {
      global: {
        stubs: { BModal: true, BButton: { template: '<button></button>' }, FormKit: true },
      },
    })
    const file = new File(['a'], 'a.png', { type: 'image/png' })
    const orig = window.FileReader
    ;(window as any).FileReader = class {
      result: string | ArrayBuffer | null = null
      onload: any = null
      readAsDataURL() {
        this.result = 'data:'
        this.onload?.()
      }
    }
    await (wrapper.vm as any).handleFileChange({ target: { files: [file] } } as any)
    window.FileReader = orig
    expect((wrapper.vm as any).preview).not.toBeNull()
    expect((wrapper.vm as any).showModal).toBe(true)
  })
})
