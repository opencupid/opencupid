import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ListmonkSyncService } from '../../services/listmonkSync.service'
import type { User } from '@prisma/client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

// Mock appConfig
vi.mock('../../lib/appconfig', () => ({
  appConfig: {
    LISTMONK_URL: 'http://localhost:9000',
    LISTMONK_ADMIN_USER: 'admin',
    LISTMONK_ADMIN_PASSWORD: 'password',
    LISTMONK_LIST_ID: 1,
  },
}))

describe('ListmonkSyncService', () => {
  let service: ListmonkSyncService
  let consoleErrorSpy: any

  beforeEach(() => {
    service = ListmonkSyncService.getInstance()
    mockFetch.mockClear()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  const createMockUser = (overrides?: Partial<User>): User => ({
    id: 'user1',
    email: 'test@example.com',
    phonenumber: null,
    tokenVersion: 0,
    loginToken: null,
    loginTokenExp: null,
    isActive: true,
    isBlocked: false,
    isRegistrationConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    language: 'en',
    newsletterOptIn: false,
    roles: [],
    ...overrides,
  })

  describe('syncUser', () => {
    it('should not sync user without email', async () => {
      const user = createMockUser({ email: null })
      await service.syncUser(user)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should create new subscriber when user does not exist', async () => {
      const user = createMockUser({ newsletterOptIn: true })

      // Mock getSubscriber to return null (user doesn't exist)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { results: [] } }),
      })

      // Mock createSubscriber
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      })

      await service.syncUser(user)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // Check getSubscriber call
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:9000/api/subscribers?query=subscribers.email=\'test@example.com\'',
        expect.objectContaining({
          method: 'GET',
        })
      )

      // Check createSubscriber call
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:9000/api/subscribers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            name: 'test@example.com',
            status: 'enabled',
            lists: [1],
            attribs: {
              language: 'en',
            },
          }),
        })
      )
    })

    it('should update existing subscriber', async () => {
      const user = createMockUser({ newsletterOptIn: true, language: 'de' })

      // Mock getSubscriber to return existing subscriber
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              {
                id: 42,
                email: 'test@example.com',
                name: 'test@example.com',
                status: 'disabled',
                lists: [],
              },
            ],
          },
        }),
      })

      // Mock updateSubscriber
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 42 } }),
      })

      await service.syncUser(user)

      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Check updateSubscriber call
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:9000/api/subscribers/42',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            email: 'test@example.com',
            name: 'test@example.com',
            status: 'enabled',
            lists: [1],
            attribs: {
              language: 'de',
            },
          }),
        })
      )
    })

    it('should disable subscriber when newsletterOptIn is false', async () => {
      const user = createMockUser({ newsletterOptIn: false })

      // Mock getSubscriber
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { results: [] } }),
      })

      // Mock createSubscriber
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      })

      await service.syncUser(user)

      // Check that subscriber is created with disabled status and no lists
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:9000/api/subscribers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            name: 'test@example.com',
            status: 'disabled',
            lists: [],
            attribs: {
              language: 'en',
            },
          }),
        })
      )
    })

    it('should not throw error on sync failure', async () => {
      const user = createMockUser()

      // Mock fetch to fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(service.syncUser(user)).resolves.toBeUndefined()

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Listmonk sync failed for user',
        'user1',
        expect.any(Error)
      )
    })
  })
})
