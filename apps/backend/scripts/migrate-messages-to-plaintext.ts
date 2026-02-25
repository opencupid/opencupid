/**
 * Migrate existing HTML-encoded message content to plain text.
 *
 * Old format: HTML-entity-encoded text with <br> for newlines
 *   e.g. "Hello&lt;br&gt;World&amp;amp; friends"
 *
 * New format: Plain text with literal newlines and markdown
 *   e.g. "Hello\nWorld& friends"
 *
 * Usage: npx tsx scripts/migrate-messages-to-plaintext.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 500

function htmlToPlaintext(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

function needsMigration(content: string): boolean {
  return (
    content.includes('<br>') ||
    content.includes('<br/>') ||
    content.includes('<br />') ||
    content.includes('&amp;') ||
    content.includes('&lt;') ||
    content.includes('&gt;') ||
    content.includes('&quot;') ||
    content.includes('&#x27;') ||
    content.includes('&#x2F;')
  )
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===')

  let cursor: string | undefined
  let totalProcessed = 0
  let totalUpdated = 0

  while (true) {
    const messages = await prisma.message.findMany({
      where: { messageType: 'text/plain' },
      select: { id: true, content: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (messages.length === 0) break

    const updates: { id: string; content: string }[] = []

    for (const msg of messages) {
      if (needsMigration(msg.content)) {
        updates.push({ id: msg.id, content: htmlToPlaintext(msg.content) })
      }
    }

    if (updates.length > 0 && !DRY_RUN) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.message.update({ where: { id: u.id }, data: { content: u.content } })
        )
      )
    }

    totalProcessed += messages.length
    totalUpdated += updates.length
    cursor = messages[messages.length - 1]!.id

    if (updates.length > 0) {
      console.log(`Batch: ${messages.length} processed, ${updates.length} updated`)
    }
  }

  console.log(`\nDone. ${totalProcessed} messages processed, ${totalUpdated} updated.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
