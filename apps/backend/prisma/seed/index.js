const { PrismaClient } = require('@prisma/client')
const seedTags = require('./tags')
const seedMessageTemplates = require('./message-templates')

const prisma = new PrismaClient()

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
