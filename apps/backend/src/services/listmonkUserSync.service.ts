import { appConfig } from '@/lib/appconfig'
import { ListmonkEmailProvider } from './providers/ListmonkEmailProvider'

export class ListmonkUserSyncService {
  private listmonkProvider: ListmonkEmailProvider | null = null

  constructor() {
    // Only initialize if Listmonk is configured
    if (appConfig.LISTMONK_URL && appConfig.LISTMONK_USERNAME && appConfig.LISTMONK_PASSWORD) {
      try {
        this.listmonkProvider = new ListmonkEmailProvider()
      } catch (error) {
        console.warn('Failed to initialize Listmonk provider for user sync:', error)
      }
    }
  }

  async syncUser(user: {
    id: string
    email: string
    displayName?: string | null
    language?: string | null
  }): Promise<void> {
    if (!this.listmonkProvider) {
      // Listmonk not configured, skip sync
      return
    }

    try {
      await this.listmonkProvider.syncSubscriber(
        user.email,
        user.displayName || undefined,
        {
          user_id: user.id,
          language: user.language || 'en',
          sync_source: 'opencupid_backend',
        }
      )
    } catch (error) {
      // Log but don't throw - user sync is best effort
      console.warn(`Failed to sync user ${user.id} to Listmonk:`, error)
    }
  }

  async isListmonkAvailable(): Promise<boolean> {
    return this.listmonkProvider !== null
  }
}

export const listmonkUserSyncService = new ListmonkUserSyncService()