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
  const errors: Array<{ userId: string; email: string; error: string }> = []

  for (const user of users) {
    try {
      await listmonkSyncService.syncUser(user)
      successCount++
      console.log(`✅ Synced user ${user.id} (${user.email})`)
    } catch (error) {
      failureCount++
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push({ 
        userId: user.id, 
        email: user.email!, 
        error: errorMessage 
      })
      console.error(`❌ Failed to sync user ${user.id} (${user.email}): ${errorMessage}`)
    }
  }

  console.log('\n📈 Migration Summary:')
  console.log(`  Total users: ${users.length}`)
  console.log(`  ✅ Successfully synced: ${successCount}`)
  console.log(`  ❌ Failed: ${failureCount}`)
  
  if (errors.length > 0) {
    console.log('\n⚠️  Failed users details:')
    const errorsByType = errors.reduce((acc, err) => {
      acc[err.error] = (acc[err.error] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(errorsByType).forEach(([error, count]) => {
      console.log(`  - ${error}: ${count} user(s)`)
    })
    
    console.log('\n💡 Common issues:')
    console.log('  - "Forbidden": Check LISTMONK_ADMIN_USER and LISTMONK_ADMIN_PASSWORD are correct')
    console.log('  - "Connection refused": Ensure Listmonk service is running')
    console.log('  - Check LISTMONK_URL is accessible from the backend')
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
