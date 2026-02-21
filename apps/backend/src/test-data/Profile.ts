import 'dotenv/config'

import { faker } from '@faker-js/faker'
import fs from 'fs'
import path from 'path'
import { allFakers } from '@faker-js/faker'

import { randomBoolean } from './utils'
import {
  Gender,
  HasKids,
  Prisma,
  PrismaClient,
  ProfileImage,
  Pronouns,
  RelationshipStatus,
} from '@prisma/client'

import { ImageService } from '@/services/image.service'
import { ProfileService } from '@/services/profile.service'
import { UserService } from '@/services/user.service'

const prisma = new PrismaClient({
  // log: ['query', 'error', 'warn'],
})

const imageService = ImageService.getInstance()
const profileService = ProfileService.getInstance()
const userService = UserService.getInstance()

const howMany = 30
const languages = ['en', 'de', 'it', 'fr', 'es', 'hu', 'nl']
const locales = {
  en: allFakers.en,
  de: allFakers.de,
  it: allFakers.it,
  fr: allFakers.fr,
  es: allFakers.es,
  hu: allFakers.hu,
  nl: allFakers.nl,
}
const genders = ['male', 'female']

export function createRandomUser() {
  return {
    email: faker.internet.email(),
    createdAt: faker.date.past(),
    lastLoginAt: faker.date.recent(),
    isRegistrationConfirmed: true,
    isActive: true,
    isOnboarded: true,
    // roles: ['user'],
  }
}

let tags = [] as any[]
let files: string[] = []

async function main() {
  let locale = ''
  tags = await fetchTags()
  const users = faker.helpers.multiple(createRandomUser, {
    count: howMany,
  })

  await initializeImagePools()

  for (const user of users) {
    // Create the user in the database
    const createdUser = await prisma.user.create({
      data: user,
    })

    let isSocialActive = randomBoolean(0.8) // higher chance
    let isDatingActive = randomBoolean(0.6) // lower chance

    if (!isSocialActive && !isDatingActive) {
      // force one to be true — prefer isSocialActive
      isSocialActive = true
    }

    const gender = weightedRandom(genders, weights)

    const langs = faker.helpers.arrayElements(languages, faker.number.int({ min: 1, max: 3 }))
    locale = langs[0]

    const randomTags = faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 5 }))

    const f = (allFakers as any)[locale as any]

    const baseProfile = {
      user: { connect: { id: createdUser.id } },
      publicName: f.person.firstName(gender as any),
      country: faker.location.countryCode(),
      cityName: faker.location.city(),
      languages: langs,

      isDatingActive: isDatingActive,
      isSocialActive: isSocialActive,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      isActive: true,
      isOnboarded: true,
    }

    const datingProfile = isDatingActive
      ? {
          work: f.person.jobTitle(),
          birthday: faker.date.birthdate({ min: 18, max: 35, mode: 'age' }),
          gender: gender as Gender,
          relationship: faker.helpers.enumValue(RelationshipStatus),
          hasKids: faker.helpers.enumValue(HasKids) as HasKids,
          pronouns: faker.helpers.enumValue(Pronouns) as Pronouns,
        }
      : {}

    const datingPrefs = isDatingActive
      ? {
          prefAgeMin: 18,
          prefAgeMax: 100,
          prefGender: [],
          prefKids: [],
        }
      : {}

    const data: Prisma.ProfileCreateInput = {
      ...baseProfile,
      ...datingProfile,
      ...datingPrefs,
      tags: {
        connect: randomTags.map((tag) => ({ id: tag.id })),
      },
      localized: {
        create: langs.flatMap((locale) => [
          {
            locale,
            field: 'introDating',
            value: (allFakers as any)[locale as any].person.bio() + ' ' + f.lorem.sentences(2, 5),
          },
          {
            locale,
            field: 'introSocial',
            value: (allFakers as any)[locale as any].person.bio() + ' ' + f.lorem.sentences(1, 5),
          },
        ]),
      },
    }

    let profile
    try {
      // console.dir(data, { depth: null, colors: true })

      profile = await prisma.profile.create({
        data: data,
      })
      // console.dir(profile, { depth: null, colors: true })
    } catch (error) {
      // console.dir(error, { depth: null, colors: true })
      console.error(`Error creating profile for user ${createdUser.email}:`, error)
      return
    }

    console.log(`Created profile  with profile ID ${profile.id} for user ${createdUser.email}`)
    // console.dir(profile, { depth: null, colors: true })

    const profileImage = await attachRandomImage(profile, gender, createdUser.id)
    if (profileImage) {
      await profileService.addProfileImage(profile.id, profileImage?.id)
    } else throw new Error(`Failed to attach image to profile ${profile.id}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // await prisma.$disconnect()
    // process.exit(0)
  })

async function fetchTags() {
  return await prisma.tag.findMany({
    select: {
      id: true,
    },
  })
}
const avatarDir = path.resolve('test-data/images/avatar')

// Keep track of used images across runs
const usedImages = new Set<string>()
const genderImagePool = new Map<string, string[]>()

async function initializeImagePools() {
  const files = await fs.promises.readdir(avatarDir)

  for (const file of files) {
    const match = file.match(/.*\.(\w+)\.(jpeg|jpg)$/)
    if (!match) continue

    const gender = match[1].toLowerCase()
    if (!genderImagePool.has(gender)) {
      genderImagePool.set(gender, [])
    }

    genderImagePool.get(gender)!.push(file)
  }
}

async function attachRandomImage(
  profile: any,
  gender: string,
  userId: string
): Promise<ProfileImage | null> {
  const genderKey = gender.toLowerCase()
  const pool = genderImagePool.get(genderKey)

  if (!pool || pool.length === 0) {
    console.warn(`⚠️ No available image left for gender "${genderKey}"`)
    return null
  }

  const file = pool.pop()! // guaranteed non-null
  const tmpFile = path.join(avatarDir, file)

  try {
    const profileImage = await imageService.storeImage(
      userId,
      tmpFile,
      faker.lorem.sentence({ min: 1, max: 2 })
    )

    console.log(`📸 Attached image ${file} to profile ${profile.id}`)
    return profileImage
  } catch (err) {
    console.error(`❌ Failed to store image ${file} for profile ${profile.id}`, err)
  }
  return null
}

const weights = [0.45, 0.45, 0.1]

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0)
  const r = Math.random() * total
  let acc = 0
  for (let i = 0; i < items.length; i++) {
    acc += weights[i]
    if (r < acc) return items[i]
  }
  return items[items.length - 1] // fallback
}
