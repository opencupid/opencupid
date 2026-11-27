// Fails when a translation key used in frontend code is missing from the source locale.
// i18n-check (test:i18n) only compares locales against each other, so a key absent
// from every locale file would otherwise pass unnoticed.
import path from 'node:path'
import {
  readVueFiles,
  readLanguageFiles,
  extractI18NItemsFromVueFiles,
  extractI18NLanguageFromLanguageFiles,
  extractI18NReport,
} from 'vue-i18n-extract'

const SOURCE_LOCALE = 'en'

const vueFiles = readVueFiles(path.resolve('./src/**/*.?(ts|vue)')).filter(
  (file) => !file.path.includes('/__tests__/')
)
const languageFiles = readLanguageFiles(
  path.resolve(`../../packages/shared/i18n/${SOURCE_LOCALE}.json`)
)
const { missingKeys } = extractI18NReport(
  extractI18NItemsFromVueFiles(vueFiles),
  extractI18NLanguageFromLanguageFiles(languageFiles)
)

if (missingKeys.length) {
  console.error(`Translation keys missing from ${SOURCE_LOCALE}.json:`)
  console.table(missingKeys.map(({ path, file, line }) => ({ key: path, file, line })))
  process.exit(1)
}
console.log(`All translation keys used in code exist in ${SOURCE_LOCALE}.json`)
