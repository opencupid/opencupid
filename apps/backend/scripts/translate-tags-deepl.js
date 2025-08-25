import { PrismaClient } from '@prisma/client'
import * as deepl from 'deepl-node';

const prisma = new PrismaClient()

// Parse credentials JSON from env
const authKey = process.env.DEEPL_API_KEY
const deeplClient = new deepl.DeepLClient(authKey);

const TARGET_LOCALES = ['en-GB', 'fr', 'de', 'hu', 'es', 'fr', 'it', 'pt-PT', 'sk', 'pl', 'ro', 'nl']

const dryRun = false // Toggle this

async function translateText(text, source, target) {
  const translated = await deeplClient.translateText(text, source, target)
  return translated.text
}

async function main() {
  const tags = await prisma.tag.findMany({
    include: { translations: true },
  })

  let count = 0

  for (const tag of tags) {
    const existing = new Set(tag.translations.map(t => t.locale))

    const sourceLocale = tag.originalLocale || 'en'
    const sourceText = tag.translations.find(t => t.locale === sourceLocale)?.name || tag.name

    for (const longLocale of TARGET_LOCALES) {

      const locale = longLocale.slice(0,2) // Use only the first two characters for locale
      if (existing.has(locale) || locale === sourceLocale.slice(0,2)) continue

      try {
        const translated = await translateText(sourceText, sourceLocale, longLocale)

        if (dryRun) {
          console.log(`Would translate "${sourceText}" (${sourceLocale}) → [${locale}] "${translated}"`)
        } else {
          await prisma.tagTranslation.upsert({
            where: {
              tagId_locale: {
                tagId: tag.id,
                locale: locale,
              },
            },
            update: {
              tagId: tag.id,
              locale,
              name: translated,
            },
            create: {
              tagId: tag.id,
              locale,
              name: translated,
            },
          })
          console.log(`✔ Translated "${sourceText}" (${sourceLocale}) → [${locale}] "${translated}"`)
        }

        count++
      } catch (err) {
        console.error(`❌ Failed to translate "${sourceText}" (${sourceLocale}) to [${locale}]:`, err)
      }
    }
      await sleep(1000); // Wait for 1 second
  }

  console.log(dryRun
    ? `🔎 Dry run complete. Would create ${count} translations.`
    : `✅ Created ${count} translations.`)
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
