import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAppColorMode } from '../useAppColorMode'

function mockSystemPreference(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: dark && query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

describe('useAppColorMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-bs-theme')
  })

  it('follows a dark browser preference when nothing is stored', () => {
    mockSystemPreference(true)

    expect(useAppColorMode().value).toBe('dark')
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark')
  })

  it('follows a light browser preference when nothing is stored', () => {
    mockSystemPreference(false)

    expect(useAppColorMode().value).toBe('light')
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light')
  })

  it('prefers the stored choice over the browser preference', () => {
    mockSystemPreference(true)
    localStorage.setItem('color-mode', 'light')

    expect(useAppColorMode().value).toBe('light')
  })

  it('applies and persists a newly chosen mode', async () => {
    mockSystemPreference(false)
    const mode = useAppColorMode()

    mode.value = 'dark'
    await nextTick()

    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark')
    expect(localStorage.getItem('color-mode')).toBe('dark')
  })
})
