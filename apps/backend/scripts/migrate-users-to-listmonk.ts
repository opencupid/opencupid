import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { listmonkSyncService } from '../src/services/listmonkSync.service'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting migration of existing users to Listmonk...')

  // Fetch all users with email addresses
  const users = await prisma.user.findMany({
    where: {
      email: {
        not: null,
      },
    },
  })

  console.log(`📊 Found ${users.length} users with email addresses`)

  let successCount = 0
  let failureCount = 0

  for (const user of users) {
    try {
      await listmonkSyncService.syncUser(user)
      successCount++
      console.log(`✅ Synced user ${user.id} (${user.email})`)
    } catch (error) {
      failureCount++
      console.error(`❌ Failed to sync user ${user.id} (${user.email}):`, error)
    }
  }

  console.log('\n📈 Migration Summary:')
  console.log(`  Total users: ${users.length}`)
  console.log(`  ✅ Successfully synced: ${successCount}`)
  console.log(`  ❌ Failed: ${failureCount}`)
  console.log('\n✨ Migration complete!')
}

main()
  .catch(err => {
    console.error('💥 Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
