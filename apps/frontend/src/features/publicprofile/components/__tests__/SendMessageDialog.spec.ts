import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// The real panel pulls in the voice recorder, which needs Web Workers.
vi.mock('@/features/messaging/components/ContactFormPanel.vue', () => ({
  default: { template: '<div class="panel" />' },
}))

import SendMessageDialog from '../SendMessageDialog.vue'

const stubs = {
  BModal: { template: '<div><slot name="title" /><slot /></div>' },
  RouterLink: { template: '<a><slot /></a>' },
  ProfileMarker: {
    props: { profile: Object, highlighted: Boolean },
    template: '<i class="marker" :data-hl="highlighted" />',
  },
}

const mountDialog = (isDatingActive: boolean) =>
  mount(SendMessageDialog, {
    props: { profile: { id: 'p1', publicName: 'Alexa', isDatingActive } as any, modelValue: true },
    global: { stubs, mocks: { $t: (k: string) => k } },
  })

describe('SendMessageDialog', () => {
  it('highlights the recipient marker for a potential match', () => {
    expect(mountDialog(true).find('.marker').attributes('data-hl')).toBe('true')
  })

  it('shows a plain marker otherwise', () => {
    expect(mountDialog(false).find('.marker').attributes('data-hl')).toBe('false')
  })
})
