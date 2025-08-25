import { PrismaClient } from '@prisma/client'
import { v2 as Translate } from '@google-cloud/translate'

const prisma = new PrismaClient()

// Parse credentials JSON from env
const translate = new Translate.Translate()

const TARGET_LOCALES = ['en-GB', 'fr', 'de', 'hu', 'es', 'fr', 'it', 'pt-PT', 'sk', 'pl', 'ro', 'nl']

const dryRun = false // Toggle this

async function translateText(text, target) {
  const [translated] = await translate.translate(text, target)
  return translated
}

async function main() {
  const tags = await prisma.tag.findMany({
    include: { translations: true },
  })

  let count = 0

  for (const tag of tags) {
    const existing = new Set(tag.translations.map(t => t.locale))
    const sourceLocale = tag.originalLocale || 'en'

    for (const longLocale of TARGET_LOCALES) {
      const locale = longLocale.slice(0,2) // Use only the first two characters for locale
      if (existing.has(locale) || locale === sourceLocale.slice(0,2)) continue

      try {
        const translated = await translateText(tag.name, locale)

        if (dryRun) {
          console.log(`Would translate "${tag.name}" → [${locale}] "${translated}"`)
        } else {
          await prisma.tagTranslation.create({
            data: {
              tagId: tag.id,
              locale,
              name: translated,
            },
          })
          console.log(`✔ Translated "${tag.name}" → [${locale}] "${translated}"`)
        }

        count++
      } catch (err) {
        console.error(`❌ Failed to translate "${tag.name}" to [${locale}]:`, err)
      }
    }
  }

  console.log(dryRun
    ? `🔎 Dry run complete. Would create ${count} translations.`
    : `✅ Created ${count} translations.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
