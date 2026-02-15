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
    LISTMONK_API_TOKEN: 'admin:password',
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
    it('should return false for user without email', async () => {
      const user = createMockUser({ email: null })
      const result = await service.syncUser(user)
      expect(result).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return true when creating new subscriber succeeds', async () => {
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

      const result = await service.syncUser(user)
      expect(result).toBe(true)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // Check getSubscriber call
      const expectedQuery = encodeURIComponent("email LIKE 'test@example.com'")
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `http://localhost:9000/api/subscribers?query=${expectedQuery}`,
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
              newsletterOptin: true,
            },
          }),
        })
      )
    })

    it('should return true when updating existing subscriber succeeds', async () => {
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

      const result = await service.syncUser(user)
      expect(result).toBe(true)

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
              newsletterOptin: true,
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

      const result = await service.syncUser(user)
      expect(result).toBe(true)

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
              newsletterOptin: false,
            },
          }),
        })
      )
    })

    it('should return false on sync failure', async () => {
      const user = createMockUser()

      // Mock fetch to fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.syncUser(user)
      expect(result).toBe(false)

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Listmonk sync failed for user',
        'user1',
        expect.any(Error)
      )
    })
  })
})
