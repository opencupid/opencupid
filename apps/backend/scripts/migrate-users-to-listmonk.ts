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
    const success = await listmonkSyncService.syncUser(user)
    
    if (success) {
      successCount++
      console.log(`✅ Synced user ${user.id} (${user.email})`)
    } else {
      failureCount++
      // The error details were already logged by syncUser
      console.log(`❌ Failed to sync user ${user.id} (${user.email})`)
    }
  }

  console.log('\n📈 Migration Summary:')
  console.log(`  Total users: ${users.length}`)
  console.log(`  ✅ Successfully synced: ${successCount}`)
  console.log(`  ❌ Failed: ${failureCount}`)
  
  if (failureCount > 0) {
    console.log('\n💡 Common issues:')
    console.log('  - "Forbidden" or "invalid API credentials": Check LISTMONK_ADMIN_USER and LISTMONK_ADMIN_PASSWORD')
    console.log('  - "Connection refused": Ensure Listmonk service is running')
    console.log('  - Check LISTMONK_URL is accessible from the backend')
    console.log('\n⚠️  Review the error messages above for specific details about each failure.')
  }
  
  console.log('\n✨ Migration complete!')
  
  // Exit with error code if any failures occurred
  if (failureCount > 0) {
    process.exit(1)
  }
}

main()
  .catch(err => {
    console.error('💥 Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
