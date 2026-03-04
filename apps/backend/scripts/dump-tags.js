const { PrismaClient } = require('@prisma/client')
const { writeFileSync } = require('fs')
const { join } = require('path')

const prisma = new PrismaClient()

async function main() {
  const whereClause = { isUserCreated: false, isHidden: false, isDeleted: false } 
  const [tags, tagTranslations] = await Promise.all([
    prisma.tag.findMany({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        name: true,
        originalLocale: true,
        isUserCreated: true,
        isApproved: true,
        isHidden: true,
        isDeleted: true,
      },
    }),
    prisma.tagTranslation.findMany({
      where: {
        tag: whereClause,
      },
      select: { tagId: true, locale: true, name: true },
    }),
  ])

  const seedDir = join(__dirname, '../prisma/seed')
  writeFileSync(join(seedDir, 'tags-data.json'), JSON.stringify(tags, null, 2))
  writeFileSync(join(seedDir, 'tag-translations-data.json'), JSON.stringify(tagTranslations, null, 2))

  console.log(`Dumped ${tags.length} tags, ${tagTranslations.length} translations`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
