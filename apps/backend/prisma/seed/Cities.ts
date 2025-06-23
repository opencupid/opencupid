// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import cities from 'all-the-cities'
// import type {} from '@types/all-the-cities'
const prisma = new PrismaClient()

const countries = ['HU', 'DE', 'IT', 'FR', 'ES', 'PT', 'NL', 'GB', 'PL']

function shuffle<T>(array: T[]): T[] {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

async function main() {



  const grouped = new Map<string, any[]>()

  shuffle(
    cities.filter(c => countries.includes(c.country))
  ).forEach(c => {
    const list = grouped.get(c.country) ?? []
    if (list.length < 50) {
      list.push(c)
      grouped.set(c.country, list)
    }
  })

  const toUpsert = Array.from(grouped.values())
    .flat()
    .map(c => ({
      name: c.name,
      country: c.country,
      lat: c.loc.coordinates[1],
      lon: c.loc.coordinates[0],
      isApproved: true,
    }))

  const recordsToInsert = toUpsert.length
  // await prisma.$executeRawUnsafe(`DELETE FROM City`);
  // Upsert all in batches
  for (let i = 0; i < recordsToInsert; i += 10) {
    const batch = toUpsert.slice(i, i + 10)
    await Promise.all(batch.map(city =>
      prisma.city.create({
        data: city
      })
    ))
  }
  console.log(`Seeded ${recordsToInsert} cities!`)
}

main()
  .catch(e => { throw e })
  .finally(() => prisma.$disconnect())
