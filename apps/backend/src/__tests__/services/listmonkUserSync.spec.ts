import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListmonkUserSyncService } from '../../services/listmonkUserSync.service'

// Mock appConfig
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    LISTMONK_URL: 'https://listmonk.example.com',
    LISTMONK_USERNAME: 'admin',
    LISTMONK_PASSWORD: 'password',
  },
}))

// Mock ListmonkEmailProvider
const mockSyncSubscriber = vi.fn()
vi.mock('../../services/providers/ListmonkEmailProvider', () => ({
  ListmonkEmailProvider: vi.fn().mockImplementation(() => ({
    syncSubscriber: mockSyncSubscriber,
  })),
}))

describe('ListmonkUserSyncService', () => {
  let service: ListmonkUserSyncService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ListmonkUserSyncService()
  })

  it('should sync user to Listmonk', async () => {
    mockSyncSubscriber.mockResolvedValue(undefined)

    const user = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      language: 'en',
    }

    await service.syncUser(user)

    expect(mockSyncSubscriber).toHaveBeenCalledWith(
      'test@example.com',
      'Test User',
      {
        user_id: 'user123',
        language: 'en',
        sync_source: 'opencupid_backend',
      }
    )
  })

  it('should handle sync errors gracefully', async () => {
    mockSyncSubscriber.mockRejectedValue(new Error('Sync failed'))
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const user = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      language: 'en',
    }

    // Should not throw
    await expect(service.syncUser(user)).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to sync user user123 to Listmonk:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should check if Listmonk is available', async () => {
    const isAvailable = await service.isListmonkAvailable()
    expect(isAvailable).toBe(true)
  })
})