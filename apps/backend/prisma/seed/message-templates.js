const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Default content for the welcome message, copied from the previous i18n strings
// (packages/shared/i18n/{en,hu}.json -> messages.welcome_message). Kept here as the
// single source of truth for fresh databases; production deployments receive the same
// rows from the 20260427120000_add_message_template migration's INSERT block.
const templates = [
  {
    type: 'welcome',
    locale: 'en',
    content:
      'Welcome to {siteName}!\nI am Mookie, your host.\nThis is a place for us to connect, meet new people, and find like-minded souls. I hope you enjoy your stay here.\nHappy connecting!\n- Mookie',
  },
  {
    type: 'welcome',
    locale: 'hu',
    content:
      'Üdv a {siteName} oldalon !\nMookie vagyok, a házigazda.\nEz egy olyan hely, ahol kapcsolatba léphetünk, új emberekkel találkozhatunk, és megtalálhatjuk a hasonlóan gondolkodó lelkeket. Remélem, jól fogod érezni magad itt.\nSzép kapcsolódásokat!\n\n- Mookie',
  },
]

async function main() {
  for (const t of templates) {
    await prisma.messageTemplate.upsert({
      where: { type_locale: { type: t.type, locale: t.locale } },
      create: t,
      update: {},
    })
  }
  console.log(`Seeded ${templates.length} message templates`)
}

module.exports = main

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
