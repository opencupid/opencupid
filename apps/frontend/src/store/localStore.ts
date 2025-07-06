// import { type ToastMessage } from '@/lib/toast'
import { defineStore } from 'pinia'
import { bus } from '@/lib/bus'
import type { ProfileScope } from '@zod/profile/profile.dto'

export interface LocalState {
  messageDrafts: Record<string, string>
  language: string
  theme: string
  currentScope: ProfileScope | null
}

export const useLocalStore = defineStore('local', {
  state: (): LocalState => ({
    messageDrafts: {},
    language: 'en',
    theme: 'light',
    currentScope: null,
  }),
  getters: {
    getLanguage: state => state.language,
    getTheme: state => state.theme,
    getCurrentScope: state => state.currentScope,
    getMessageDraft: state => (id: string) => state.messageDrafts[id] || '',
  },
  actions: {
    setMessageDraft(profileId: string, message: string) {
      this.messageDrafts[profileId] = message
      localStorage.setItem('messageDrafts', JSON.stringify(this.messageDrafts))
    },
    async initialize() {
      const stored = localStorage.getItem('messageDrafts')
      if (stored) {
        try {
          this.messageDrafts = JSON.parse(stored)
        } catch {
          this.messageDrafts = {}
        }
      }

      const lang = localStorage.getItem('language')
      if (lang) this.language = lang
      const theme = localStorage.getItem('theme')
      if (theme) this.theme = theme
      const scope = localStorage.getItem('currentScope')
      if (scope) this.currentScope = scope as ProfileScope

      bus.on('auth:logout', this.cleanUp)
    },
    async cleanUp() {
      this.messageDrafts = {}
      this.language = 'en'
      this.theme = 'light'
      this.currentScope = null
      localStorage.clear()
    },
    setLanguage(lang: string) {
      this.language = lang
      localStorage.setItem('language', lang)
    },
    setTheme(theme: string) {
      this.theme = theme
      localStorage.setItem('theme', theme)
    },
    setCurrentScope(scope: ProfileScope | null) {
      this.currentScope = scope
      if (scope) localStorage.setItem('currentScope', scope)
      else localStorage.removeItem('currentScope')
    }
    // setFlashMessage(message: string, type: string) {
    //   this.flashMessage = {
    //     message: message,
    //     type: type,
    //   } as ToastMessage
    // },
    // getFlashMessage() {
    //   const message = this.flashMessage
    //   this.flashMessage = null
    //   return message
    // },
  },
})
