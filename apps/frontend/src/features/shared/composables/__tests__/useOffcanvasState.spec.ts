import { describe, it, expect } from 'vitest'
import { useOffcanvasState } from '../useOffcanvasState'

describe('useOffcanvasState', () => {
  it('allows only one panel open at a time', () => {
    const state = useOffcanvasState()
    state.open('browse')
    expect(state.activePanel.value).toBe('browse')
    state.open('user')
    expect(state.activePanel.value).toBe('user')
  })

  it('closes when close() is called', () => {
    const state = useOffcanvasState()
    state.open('browse')
    state.close()
    expect(state.activePanel.value).toBeNull()
  })

  it('isOpen returns true only for the active panel', () => {
    const state = useOffcanvasState()
    state.open('user')
    expect(state.isOpen('user')).toBe(true)
    expect(state.isOpen('browse')).toBe(false)
  })
})
