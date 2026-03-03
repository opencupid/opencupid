const { PrismaClient } = require('@prisma/client')
const { writeFileSync } = require('fs')
const { join } = require('path')

const prisma = new PrismaClient()

async function main() {
  const [tags, tagTranslations] = await Promise.all([
    prisma.tag.findMany({
      where: { isUserCreated: false, isHidden: false, isDeleted: false },
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
