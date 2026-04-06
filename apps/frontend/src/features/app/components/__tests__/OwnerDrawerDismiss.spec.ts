import { nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReplace = vi.fn()
let mockRouteName = 'Me'

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useRoute: () => ({ name: mockRouteName }),
}))

const mockDrawerType = ref<'profile' | 'inbox' | null>('profile')

vi.mock('@/features/app/composables/useAppShellState', () => ({
  useAppShellState: () => ({ drawerType: mockDrawerType }),
}))

let capturedBsIsOpen: Ref<boolean>

vi.mock('@/features/shared/composables/useNativeOffcanvas', () => ({
  useNativeOffcanvas: vi.fn((_el: unknown, bsIsOpen: Ref<boolean>) => {
    capturedBsIsOpen = bsIsOpen
  }),
}))

import OwnerDrawer from '../OwnerDrawer.vue'

describe('OwnerDrawer dismiss navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteName = 'Me'
    mockDrawerType.value = 'profile'
  })

  it('calls router.replace({ name: "Browse" }) when closed on a panel route', async () => {
    mount(OwnerDrawer, { slots: { default: '<div />' } })
    capturedBsIsOpen.value = true
    await nextTick()
    capturedBsIsOpen.value = false
    await nextTick()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'Browse' })
  })

  it('does not call router.replace when already on Browse', async () => {
    mockRouteName = 'Browse'
    mount(OwnerDrawer, { slots: { default: '<div />' } })
    capturedBsIsOpen.value = true
    await nextTick()
    capturedBsIsOpen.value = false
    await nextTick()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
