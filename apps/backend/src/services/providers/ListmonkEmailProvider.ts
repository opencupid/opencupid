import { appConfig } from '@/lib/appconfig'
import type { EmailProvider, TxPayload } from '@/types/email.types'

export class ListmonkEmailProvider implements EmailProvider {
  private baseUrl: string
  private auth: string

  constructor() {
    if (!appConfig.LISTMONK_URL) {
      throw new Error('LISTMONK_URL is required for ListmonkEmailProvider')
    }
    if (!appConfig.LISTMONK_USERNAME || !appConfig.LISTMONK_PASSWORD) {
      throw new Error('LISTMONK_USERNAME and LISTMONK_PASSWORD are required for ListmonkEmailProvider')
    }

    this.baseUrl = appConfig.LISTMONK_URL.replace(/\/$/, '') // Remove trailing slash
    this.auth = Buffer.from(`${appConfig.LISTMONK_USERNAME}:${appConfig.LISTMONK_PASSWORD}`).toString('base64')
  }

  async sendTransactional(payload: TxPayload): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.auth}`,
      },
      body: JSON.stringify({
        subscriber_emails: payload.to.map(recipient => recipient.email),
        subscriber_ids: payload.to
          .map(recipient => recipient.subscriberId)
          .filter(id => id !== undefined),
        template_id: payload.templateId,
        data: payload.data || {},
        content_type: payload.contentType || 'html',
        from_email: payload.fromEmail,
        headers: payload.headers ? Object.fromEntries(
          payload.headers.map(h => Object.entries(h)).flat()
        ) : undefined,
        // Note: Listmonk API might not support attachments via /api/tx
        // This would need to be verified against actual Listmonk API documentation
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Listmonk API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
  }

  // Utility method for syncing subscribers (for future use)
  async syncSubscriber(email: string, name?: string, attributes?: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.auth}`,
      },
      body: JSON.stringify({
        email,
        name: name || '',
        status: 'enabled',
        lists: [], // Would need to be configured based on app requirements
        attribs: attributes || {},
      }),
    })

    if (!response.ok && response.status !== 409) { // 409 = subscriber already exists
      const errorText = await response.text()
      throw new Error(`Listmonk subscriber sync error: ${response.status} ${response.statusText} - ${errorText}`)
    }
  }
}