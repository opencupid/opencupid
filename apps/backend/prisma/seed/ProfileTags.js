const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const dryRun = false; // 🔁 Toggle this to true to prevent DB writes

const interestTagsPath = path.join(__dirname, 'tags.json'); // adjust if needed
const interestTagsData = JSON.parse(fs.readFileSync(interestTagsPath, 'utf-8'));

async function main() {
  let tagCount = 0;
  let translationCount = 0;

  for (const tagEntry of interestTagsData.interestTags) {
    const name = tagEntry.translations.en;
    const slug = slugify(name, { lower: true });

    if (dryRun) {
      console.log(`Would upsert Tag: ${name} → slug: ${slug}`);
    }

    const createdTag = dryRun
      ? { id: `dry-${slug}`, slug }
      : await prisma.tag.upsert({
          where: { slug },
          update: {},
          create: {
            name,
            slug,
            originalLocale: 'en',
            isApproved: true,
          },
        });

    const tagId = createdTag.id;
    tagCount++;

    for (const [locale, translation] of Object.entries(tagEntry.translations)) {
      if (!translation.trim()) continue;

      if (dryRun) {
        console.log(`  ↳ Would upsert Translation: [${locale}] ${translation}`);
      } else {
        await prisma.tagTranslation.upsert({
          where: {
            tagId_locale: {
              tagId,
              locale,
            },
          },
          update: { name: translation },
          create: {
            tagId,
            locale,
            name: translation,
          },
        });
      }

      translationCount++;
    }
  }

  console.log(
    dryRun
      ? `✅ Dry run complete. Would process ${tagCount} tags and ${translationCount} translations.`
      : `✅ Seeded ${tagCount} tags and ${translationCount} translations.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
