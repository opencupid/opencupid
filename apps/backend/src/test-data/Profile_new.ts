import 'dotenv/config'

// import { prisma } from '@/lib/prisma'
import { faker, SexType } from '@faker-js/faker'
import cuid from 'cuid'
import fs from 'fs'
import path, { basename } from 'path'
import { allFakers, allLocales } from '@faker-js/faker'
// import { prisma } from '@/lib/prisma'

import { downloadImage, randomBoolean } from './utils'
import { User, GenderType, UserRoleType } from '@zod/generated'
import { Gender, HasKids, Prisma, PrismaClient, Pronouns, RelationshipStatus } from '@prisma/client'

import { ImageService } from '@/services/image.service'
import { ProfileService } from '@/services/profile.service'
import { UserService } from '@/services/user.service'
import { appConfig } from '@/lib/appconfig'
import { UpdateProfilePayloadSchema } from '@zod/profile/profile.dto'

const prisma = new PrismaClient({
  // log: ['query', 'error', 'warn'],
})

const imageService = ImageService.getInstance()
const profileService = ProfileService.getInstance()
const userService = UserService.getInstance()

const howMany = 1
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

const testImagesDir = path.join(appConfig.MEDIA_UPLOAD_DIR, '/test-images')
// faker.seed(123);
// const prisma = new PrismaClient({
//   log: ['query', 'error', 'warn'],
// })

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
// const storagePrefix = generateStorageDirPrefix();
// const uploadBaseDir = getUploadBaseDir();
// const uploadDir = path.join(uploadBaseDir, storagePrefix)
// createStorageDir(uploadDir);

// const imageDir = './test-data/images'

async function main() {
  let locale = ''
  tags = await fetchTags()
  const users = faker.helpers.multiple(createRandomUser, {
    count: howMany,
  })

  loadImages()
  for (const user of users) {
    // Create the user in the database
    const createdUser = await prisma.user.create({
      data: user,
    })

    // const profileData = createRandomProfile(createdUser)
    let isSocialActive = randomBoolean(0.7) // higher chance
    let isDatingActive = randomBoolean(0.3) // lower chance

    if (!isSocialActive && !isDatingActive) {
      // force one to be true — prefer isSocialActive
      isSocialActive = true
    }

    // const gender = faker.person.sex() as GenderType
    const gender = faker.helpers.arrayElement(genders)
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
      // tags: randomTags,
      // introSocial: f.person.bio() + ' ' + f.lorem.sentences({ min: 1, max: 5 }),

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
          // introDating: f.person.bio() + ' ' + f.lorem.sentences({ min: 1, max: 6 }),
          birthday: faker.date.birthdate({ min: 18, max: 35, mode: 'age' }),
          gender: gender as Gender,
          relationship: faker.helpers.enumValue(RelationshipStatus),
          hasKids: faker.helpers.enumValue(HasKids) as HasKids,
          pronouns: faker.helpers.enumValue(Pronouns) as Pronouns,
        }
      : {}

    const data: Prisma.ProfileCreateInput = {
      // const data = {
      ...baseProfile,
      ...datingProfile,
      tags: {
        create: randomTags.map((tag) => ({
          tag: { connect: { id: tag.id } },
        })),
      },
      localized: {
        create: langs.flatMap((locale) => [
          {
            locale,
            field: 'introDating',
            value: f.lorem.sentences(2, 5),
          },
          {
            locale,
            field: 'introSocial',
            value: f.lorem.sentences(1, 5),
          },
        ]),
      },
    }

    // console.log(JSON.stringify(data, null, 2))
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
    console.dir(profile, { depth: null, colors: true })

    await attachRandomImage(profile, gender, createdUser.id)

    // TODO attach a random image to profile
    // images are located
    //     ls test-data/images/avatar/
    // 0c7fwqk.female.jpg  m60xwo6.male.jpg	v89awrs.female.jpg
    // 0g9fw60.male.jpg    nj74w4v.male.jpg	vpcaw56.female.jpg
    // 0kbfwea.female.jpg  nrb4wg4.female.jpg	vxeaw58.male.jpg
    // 0ndfwie.female.jpg  ...

    // pick one random image from the test-data/images/avatar/ directory
    // don't use the same image more than once
    // with the gender in profile.gender
    // then attach to profile
    //  const profileImage = await imageService.storeImage(
    //     createdUser.id,
    //     tmpFile,
    //     faker.lorem.sentence({ min: 1, max: 2 })
    //   )
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
let files: string[]
async function loadImages() {
  files = await fs.promises.readdir(avatarDir)
}

// Keep track of used images across runs
const usedImages = new Set<string>()

async function attachRandomImage(profile: any, gender: string, userId: string) {
  // const gender = profile.gender?.toLowerCase() ?? 'unspecified'

  // Filter by gender
  const matching = files.filter((file) => {
    return file.endsWith(`.${gender}.jpg`) && !usedImages.has(file)
  })

  if (matching.length === 0) {
    console.warn(`⚠️ No unused avatar left for gender "${gender}"`)
    return
  }

  const randomFile = faker.helpers.arrayElement(matching)
  const tmpFile = path.join(avatarDir, randomFile)

  try {
    const profileImage = await imageService.storeImage(
      userId,
      tmpFile,
      faker.lorem.sentence({ min: 1, max: 2 })
    )

    console.log(`Attached image ${randomFile} to profile ${profile.id}`)
    usedImages.add(randomFile)
  } catch (err) {
    console.error(`❌ Failed to store image ${randomFile} for profile ${profile.id}`, err)
  }
}
