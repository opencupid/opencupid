import 'dotenv/config'
import { PrismaClient, User } from '@prisma/client'

const prisma = new PrismaClient()

// Listmonk API configuration
const LISTMONK_URL = process.env.LISTMONK_URL || 'http://localhost:9000'
const LISTMONK_API_TOKEN = process.env.LISTMONK_API_TOKEN || ''
const LISTMONK_LIST_ID = parseInt(process.env.LISTMONK_LIST_ID || '1', 10)

interface ListmonkSubscriber {
  id?: number
  email: string
  name: string
  status: 'enabled' | 'disabled' | 'blocklisted'
  lists: number[]
  attribs: {
    language?: string
    newsletterOptIn?: boolean
  }
}

async function getSubscriber(email: string): Promise<ListmonkSubscriber | null> {
  try {
    const encodedQuery = encodeURIComponent(`email LIKE '${email}'`)
    const response = await fetch(`${LISTMONK_URL}/api/subscribers?query=${encodedQuery}`, {
      method: 'GET',
      headers: {
        Authorization: `token ${LISTMONK_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.data?.results?.[0] || null
  } catch (error) {
    console.error('Failed to get subscriber from Listmonk:', error)
    return null
  }
}

async function createSubscriber(user: User): Promise<void> {
  const subscriber: ListmonkSubscriber = {
    email: user.email!,
    name: user.email!,
    status: user.newsletterOptIn ? 'enabled' : 'disabled',
    lists: user.newsletterOptIn ? [LISTMONK_LIST_ID] : [],
    attribs: {
      language: user.language || 'en',
      newsletterOptIn: user.newsletterOptIn,
    },
  }

  const response = await fetch(`${LISTMONK_URL}/api/subscribers`, {
    method: 'POST',
    headers: {
      Authorization: `token ${LISTMONK_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscriber),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(
      `Failed to create subscriber (${response.status} ${response.statusText}): ${errorText}`
    )
  }
}

async function updateSubscriber(subscriberId: number, user: User): Promise<void> {
  const subscriber: Partial<ListmonkSubscriber> = {
    email: user.email!,
    name: user.email!,
    status: user.newsletterOptIn ? 'enabled' : 'disabled',
    lists: user.newsletterOptIn ? [LISTMONK_LIST_ID] : [],
    attribs: {
      language: user.language || 'en',
      newsletterOptIn: user.newsletterOptIn,
    },
  }

  const response = await fetch(`${LISTMONK_URL}/api/subscribers/${subscriberId}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${LISTMONK_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscriber),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(
      `Failed to update subscriber (${response.status} ${response.statusText}): ${errorText}`
    )
  }
}

async function syncUser(user: User): Promise<boolean> {
  // Only sync if user has an email
  if (!user.email) {
    return false
  }

  try {
    // Check if subscriber exists
    const existingSubscriber = await getSubscriber(user.email)

    if (existingSubscriber) {
      // Update existing subscriber
      await updateSubscriber(existingSubscriber.id!, user)
    } else {
      // Try to create new subscriber
      try {
        await createSubscriber(user)
      } catch (createError: any) {
        // If subscriber already exists (409 Conflict), fetch and update instead
        if (
          createError.message?.includes('409') ||
          createError.message?.includes('already exists')
        ) {
          const subscriber = await getSubscriber(user.email)
          if (subscriber) {
            await updateSubscriber(subscriber.id!, user)
          } else {
            throw createError
          }
        } else {
          throw createError
        }
      }
    }
    return true
  } catch (error) {
    // Log error but don't throw - this is best-effort sync
    console.error('Listmonk sync failed for user', user.id, error)
    return false
  }
}

async function main() {
  console.log('🔄 Starting migration of existing users to Listmonk...')

  // Fetch all users with email addresses and active profiles
  const users = await prisma.user.findMany({
    where: {
      email: {
        not: null,
      },
      profile: {
        isActive: true,
      },
    },
  })

  console.log(`📊 Found ${users.length} users with email addresses and active profiles`)

  let successCount = 0
  let failureCount = 0

  for (const user of users) {
    const success = await syncUser(user)
    
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
