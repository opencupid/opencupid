const { prisma } = require('../../dist/lib/prisma')
const seedTags = require('./tags')
const seedMessageTemplates = require('./message-templates')

async function main() {
  await seedTags()
  await seedMessageTemplates()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
