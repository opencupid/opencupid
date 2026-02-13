import { appConfig } from '@/lib/appconfig'
import type { User } from '@prisma/client'

interface ListmonkSubscriber {
  id?: number
  email: string
  name: string
  status: 'enabled' | 'disabled' | 'blocklisted'
  lists: number[]
  attribs: {
    language?: string
  }
}

export class ListmonkSyncService {
  private static instance: ListmonkSyncService
  private baseUrl: string
  private authHeader: string

  private constructor() {
    this.baseUrl = appConfig.LISTMONK_URL
    const auth = Buffer.from(
      `${appConfig.LISTMONK_ADMIN_USER}:${appConfig.LISTMONK_ADMIN_PASSWORD}`
    ).toString('base64')
    this.authHeader = `Basic ${auth}`
  }

  public static getInstance(): ListmonkSyncService {
    if (!ListmonkSyncService.instance) {
      ListmonkSyncService.instance = new ListmonkSyncService()
    }
    return ListmonkSyncService.instance
  }

  /**
   * Synchronize a user to Listmonk
   * This is a best-effort operation - failures won't throw errors
   */
  async syncUser(user: User): Promise<void> {
    // Only sync if user has an email
    if (!user.email) {
      return
    }

    try {
      // Check if subscriber exists
      const existingSubscriber = await this.getSubscriber(user.email)

      if (existingSubscriber) {
        // Update existing subscriber
        await this.updateSubscriber(existingSubscriber.id!, user)
      } else {
        // Create new subscriber
        await this.createSubscriber(user)
      }
    } catch (error) {
      // Log error but don't throw - this is best-effort sync
      console.error('Listmonk sync failed for user', user.id, error)
    }
  }

  private async getSubscriber(email: string): Promise<ListmonkSubscriber | null> {
    try {
      // Use the query parameter to search for subscriber by email
      // Listmonk's API accepts: ?query=email LIKE 'user@example.com'
      const encodedEmail = encodeURIComponent(email)
      const encodedQuery = encodeURIComponent(`email LIKE '${email}'`)
      const response = await fetch(
        `${this.baseUrl}/api/subscribers?query=${encodedQuery}`,
        {
          method: 'GET',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.data?.results?.[0] || null
    } catch (error) {
      console.error('Failed to get subscriber from Listmonk:', error)
      return null
    }
  }

  private async createSubscriber(user: User): Promise<void> {
    const subscriber: ListmonkSubscriber = {
      email: user.email!,
      name: user.email!,
      status: user.newsletterOptIn ? 'enabled' : 'disabled',
      lists: user.newsletterOptIn ? [appConfig.LISTMONK_LIST_ID] : [],
      attribs: {
        language: user.language || 'en',
      },
    }

    const response = await fetch(`${this.baseUrl}/api/subscribers`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriber),
    })

    if (!response.ok) {
      throw new Error(`Failed to create subscriber: ${response.statusText}`)
    }
  }

  private async updateSubscriber(subscriberId: number, user: User): Promise<void> {
    const subscriber: Partial<ListmonkSubscriber> = {
      email: user.email!,
      name: user.email!,
      status: user.newsletterOptIn ? 'enabled' : 'disabled',
      lists: user.newsletterOptIn ? [appConfig.LISTMONK_LIST_ID] : [],
      attribs: {
        language: user.language || 'en',
      },
    }

    const response = await fetch(`${this.baseUrl}/api/subscribers/${subscriberId}`, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriber),
    })

    if (!response.ok) {
      throw new Error(`Failed to update subscriber: ${response.statusText}`)
    }
  }
}

export const listmonkSyncService = ListmonkSyncService.getInstance()
