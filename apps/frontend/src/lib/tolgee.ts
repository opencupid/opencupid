import { Tolgee, DevTools, FormatSimple } from '@tolgee/vue'

type NestedMessages = Record<string, unknown>
type FlatMessages = Record<string, string>

function flattenMessages(obj: NestedMessages, prefix = ''): FlatMessages {
  const result: FlatMessages = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value as NestedMessages, fullKey))
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}

const localeModules = import.meta.glob('@shared/i18n/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, NestedMessages>

const LOCALE_FILE_REGEX = /([\w-]+)\.json$/

const staticData: Record<string, FlatMessages> = {}
for (const [path, messages] of Object.entries(localeModules)) {
  const locale = path.match(LOCALE_FILE_REGEX)?.[1]
  if (locale) {
    staticData[locale] = flattenMessages(messages)
  }
}

export { staticData }

export const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    language: 'en',
    staticData,
    availableLanguages: Object.keys(staticData),
  })
