import { describe, expect, it, vi } from 'vitest'
import { processEmailJob } from '../../workers/emailWorker.processor'
import type { EmailPayload } from '../../services/email/types'
import { brandStub } from '../../test-utils/brand'

describe('processEmailJob', () => {
  it('passes EmailPayload through to sender with from address', async () => {
    const payload: EmailPayload = {
      to: 'user@example.com',
      subject: 'Welcome',
      brand: brandStub,
      templateProps: {
        siteName: 'OpenCupid',
        publicName: '',
        contentBody: 'Hello',
        callToActionLabel: 'Open app',
        callToActionUrl: 'https://example.org/app',
        fallbackHint: 'If the button does not work, copy and paste the URL.',
        footer: '',
      },
    }

    const sender = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    }

    await processEmailJob(payload, sender, 'noreply@example.org')

    expect(sender.sendEmail).toHaveBeenCalledWith(payload, 'noreply@example.org')
  })
})
