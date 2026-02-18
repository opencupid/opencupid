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
    newsletterOptIn?: boolean
  }
}

export class ListmonkSyncService {
  private static instance: ListmonkSyncService
  private baseUrl: string
  private authHeader: string

  private constructor() {
    this.baseUrl = appConfig.LISTMONK_URL
    // Use Listmonk's custom token authentication: "token username:token_value"
    // Token format in env: "username:token_value" (e.g., "api_user:BDqyWm3XX5jgEMrSqL")
    this.authHeader = `token ${appConfig.LISTMONK_API_TOKEN}`
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
   * @returns true if sync succeeded, false if it failed
   */
  async syncUser(user: User): Promise<boolean> {
    // Only sync if user has an email
    if (!user.email) {
      return false
    }

    try {
      // Check if subscriber exists
      const existingSubscriber = await this.getSubscriber(user.email)

      if (existingSubscriber) {
        // Update existing subscriber
        await this.updateSubscriber(existingSubscriber.id!, user)
      } else {
        // Try to create new subscriber
        try {
          await this.createSubscriber(user)
        } catch (createError: any) {
          // If subscriber already exists (409 Conflict), fetch and update instead
          if (
            createError.message?.includes('409') ||
            createError.message?.includes('already exists')
          ) {
            const subscriber = await this.getSubscriber(user.email)
            if (subscriber) {
              await this.updateSubscriber(subscriber.id!, user)
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        }
      }
      return true
    } catch (error) {
      // Log error but don't throw - this is best-effort sync
      console.error('Listmonk sync failed for user', user.id, error)
      return false
    }
  }

  private async getSubscriber(email: string): Promise<ListmonkSubscriber | null> {
    try {
      // Use the query parameter to search for subscriber by email
      // Listmonk's API accepts: ?query=email LIKE 'user@example.com'
      const encodedEmail = encodeURIComponent(email)
      const encodedQuery = encodeURIComponent(`email LIKE '${email}'`)
      const response = await fetch(`${this.baseUrl}/api/subscribers?query=${encodedQuery}`, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
      })

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
        newsletterOptIn: user.newsletterOptIn,
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
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(
        `Failed to create subscriber (${response.status} ${response.statusText}): ${errorText}`
      )
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
        newsletterOptIn: user.newsletterOptIn,
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
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(
        `Failed to update subscriber (${response.status} ${response.statusText}): ${errorText}`
      )
    }
  }
}

export const listmonkSyncService = ListmonkSyncService.getInstance()
