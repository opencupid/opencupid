const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const tags = JSON.parse(fs.readFileSync(path.join(__dirname, 'tags-data.json'), 'utf-8'))
  const tagTranslations = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'tag-translations-data.json'), 'utf-8')
  )

  await prisma.tag.createMany({ data: tags, skipDuplicates: true })
  await prisma.tagTranslation.createMany({ data: tagTranslations, skipDuplicates: true })

  console.log(`Seeded ${tags.length} tags, ${tagTranslations.length} translations`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
