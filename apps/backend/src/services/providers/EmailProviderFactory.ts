import { appConfig } from '@/lib/appconfig'
import type { EmailProvider, TxPayload } from '@/types/email.types'
import { ListmonkEmailProvider } from './ListmonkEmailProvider'
import { DirectSMTPEmailProvider } from './DirectSMTPEmailProvider'

export class EmailProviderWithFallback implements EmailProvider {
  private primaryProvider: EmailProvider | null = null
  private fallbackProvider: EmailProvider

  constructor() {
    // Initialize providers
    this.fallbackProvider = new DirectSMTPEmailProvider()

    // Try to initialize Listmonk provider if configured
    if (appConfig.LISTMONK_URL && appConfig.LISTMONK_USERNAME && appConfig.LISTMONK_PASSWORD) {
      try {
        this.primaryProvider = new ListmonkEmailProvider()
      } catch (error) {
        console.warn('Failed to initialize Listmonk provider, using SMTP fallback only:', error)
      }
    }
  }

  async sendTransactional(payload: TxPayload): Promise<void> {
    // Try primary provider first (Listmonk)
    if (this.primaryProvider) {
      try {
        await this.primaryProvider.sendTransactional(payload)
        return
      } catch (error) {
        console.warn('Primary email provider failed, falling back to SMTP:', error)
      }
    }

    // Fall back to SMTP
    await this.fallbackProvider.sendTransactional(payload)
  }
}

// Factory function to create the appropriate provider
export function createEmailProvider(): EmailProvider {
  return new EmailProviderWithFallback()
}