import fp from 'fastify-plugin'
import axios, { AxiosInstance } from 'axios'
import { appConfig } from '@/lib/appconfig'

export interface ListmonkConfig {
  baseURL: string
  username: string
  password: string
  listId: number
  enabled: boolean
}

export interface ListmonkClient {
  // Core API methods
  upsertSubscriber(email: string, name: string, attributes?: Record<string, any>): Promise<{ id: number; uuid: string }>
  subscribeToList(subscriberId: number, listId: number): Promise<void>
  unsubscribeFromList(subscriberId: number, listId: number): Promise<void>
  updateSubscriberStatus(subscriberId: number, status: 'enabled' | 'disabled'): Promise<void>
  
  // Direct axios instance for custom calls
  api: AxiosInstance
}

class ListmonkClientImpl implements ListmonkClient {
  public readonly api: AxiosInstance
  private readonly config: ListmonkConfig

  constructor(config: ListmonkConfig) {
    this.config = config
    this.api = axios.create({
      baseURL: config.baseURL,
      auth: {
        username: config.username,
        password: config.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  async upsertSubscriber(email: string, name: string, attributes: Record<string, any> = {}): Promise<{ id: number; uuid: string }> {
    try {
      // First try to get existing subscriber
      const getResponse = await this.api.get(`/api/subscribers`, {
        params: { query: `subscribers.email = '${email}'` }
      })
      
      if (getResponse.data.data.results && getResponse.data.data.results.length > 0) {
        // Update existing subscriber
        const subscriber = getResponse.data.data.results[0]
        const updateResponse = await this.api.put(`/api/subscribers/${subscriber.id}`, {
          email,
          name,
          status: 'enabled',
          attribs: attributes,
        })
        return { id: updateResponse.data.data.id, uuid: updateResponse.data.data.uuid }
      } else {
        // Create new subscriber
        const createResponse = await this.api.post('/api/subscribers', {
          email,
          name,
          status: 'enabled',
          lists: [this.config.listId],
          attribs: attributes,
        })
        return { id: createResponse.data.data.id, uuid: createResponse.data.data.uuid }
      }
    } catch (error: any) {
      throw new Error(`Failed to upsert subscriber: ${error.message}`)
    }
  }

  async subscribeToList(subscriberId: number, listId: number): Promise<void> {
    try {
      await this.api.put(`/api/subscribers/lists`, {
        ids: [subscriberId],
        action: 'add',
        target_list_ids: [listId],
        status: 'confirmed',
      })
    } catch (error: any) {
      throw new Error(`Failed to subscribe to list: ${error.message}`)
    }
  }

  async unsubscribeFromList(subscriberId: number, listId: number): Promise<void> {
    try {
      await this.api.put(`/api/subscribers/lists`, {
        ids: [subscriberId],
        action: 'remove',
        target_list_ids: [listId],
      })
    } catch (error: any) {
      throw new Error(`Failed to unsubscribe from list: ${error.message}`)
    }
  }

  async updateSubscriberStatus(subscriberId: number, status: 'enabled' | 'disabled'): Promise<void> {
    try {
      await this.api.put(`/api/subscribers/${subscriberId}`, {
        status,
      })
    } catch (error: any) {
      throw new Error(`Failed to update subscriber status: ${error.message}`)
    }
  }
}

export default fp(async (fastify) => {
  if (!appConfig.NEWSLETTER_ENABLED) {
    fastify.log.info('Newsletter functionality is disabled')
    return
  }

  if (!appConfig.LISTMONK_URL || !appConfig.LISTMONK_USER || !appConfig.LISTMONK_PASS || !appConfig.LISTMONK_LIST_ID) {
    fastify.log.warn('Listmonk configuration incomplete, newsletter functionality will be disabled')
    return
  }

  const config: ListmonkConfig = {
    baseURL: appConfig.LISTMONK_URL,
    username: appConfig.LISTMONK_USER,
    password: appConfig.LISTMONK_PASS,
    listId: appConfig.LISTMONK_LIST_ID,
    enabled: appConfig.NEWSLETTER_ENABLED,
  }

  const client = new ListmonkClientImpl(config)

  fastify.decorate('listmonk', client)
  fastify.decorate('listmonkConfig', config)

  fastify.log.info(`Listmonk client initialized for ${config.baseURL}`)
})

declare module 'fastify' {
  interface FastifyInstance {
    listmonk: ListmonkClient
    listmonkConfig: ListmonkConfig
  }
}