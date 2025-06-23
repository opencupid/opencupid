import 'dotenv/config'

// import { prisma } from '@/lib/prisma'
import { faker, SexType } from '@faker-js/faker'
import cuid from 'cuid'
import fs from 'fs'
import path, { basename } from 'path'
import { allFakers } from '@faker-js/faker';


import { downloadImage, randomBoolean } from './utils'
import { User, GenderType, UserRoleType } from '@zod/generated'
import { HasKids, Prisma, PrismaClient, Pronouns, RelationshipStatus } from '@prisma/client'

import { ImageService } from '@/services/image.service'
import { ProfileService } from '@/services/profile.service'
import { UserService } from '@/services/user.service'
import { appConfig } from '@shared/config/appconfig'
import { UpdateProfilePayloadSchema } from '@zod/profile/profile.dto'

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
const genders = ['male', 'female', 'bigender', 'cis_man', 'cis_woman']

const testImagesDir = path.join(appConfig.MEDIA_UPLOAD_DIR, '/test-images')
// faker.seed(123);
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

export function createRandomUser() {
  return {
    email: faker.internet.email(),
    createdAt: faker.date.past(),
    lastLoginAt: faker.date.recent(),
    isRegistrationConfirmed: true,
    hasActiveProfile: true,
    isActive: true,
    isOnboarded: true,
    // roles: ['user'],
  }
}


let tags = [] as any[]
let cities = [] as any[]
// const storagePrefix = generateStorageDirPrefix();
// const uploadBaseDir = getUploadBaseDir();
// const uploadDir = path.join(uploadBaseDir, storagePrefix)
// createStorageDir(uploadDir);

// const imageDir = './test-data/images'

async function main() {
  let locale = ''
  tags = await fetchTags()
  cities = await fetchCities()
  const users = faker.helpers.multiple(createRandomUser, {
    count: howMany,
  })

  users.forEach(async user => {
    // Create the user in the database
    const createdUser = await prisma.user.create({
      data: user,
    })

    // const profileData = createRandomProfile(createdUser)
    const isDatingActive = randomBoolean(0.3)
    const isSocialActive = randomBoolean(0.3)

    // const gender = faker.person.sex() as GenderType
    const gender = faker.helpers.arrayElement(genders)
    const langs = faker.helpers.arrayElements(languages, faker.number.int({ min: 1, max: 3 }))
    locale = langs[0]

    const randomTags = faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 5 }))

    const city = faker.helpers.arrayElement(cities)

    const f = (allFakers as any)[locale as any]

    const baseProfile = {
      // id: cuid(),
      user: { connect: { id: createdUser.id } },
      slug: cuid.slug(),
      publicName: f.person.firstName(gender as any),
      country: city.country,
      cityName: city.name,
      // cityId: city.id,
      city: { connect: { id: city.id } },
      languages: langs,
      // tags: randomTags,
      // introSocial: f.person.bio() + ' ' + f.lorem.sentences({ min: 1, max: 5 }),

      isActive: true,
      isDatingActive: isDatingActive,
      isSocialActive: isSocialActive,
      // createdAt: faker.date.past(),
      // updatedAt: faker.date.recent(),
    }


    const datingProfile = isDatingActive
      ? {
        work: f.person.jobTitle(),
        introDating: f.person.bio() + ' ' + f.lorem.sentences({ min: 1, max: 6 }),
        birthday: faker.date.birthdate({ min: 18, max: 35, mode: 'age' }),
        gender: gender as GenderType,
        relationship: faker.helpers.enumValue(RelationshipStatus),
        hasKids: faker.helpers.enumValue(HasKids),
        pronouns: faker.helpers.enumValue(Pronouns),
      }
      : {}

    const data: Prisma.ProfileCreateInput = {
      ...baseProfile,
      ...datingProfile,
      tags: {
        connect: randomTags,
      },
      localized: {
        create: langs.flatMap(locale => [
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
    console.dir(data, { depth: null, colors: true })
    let profile
    try {
      profile = await prisma.profile.create({
        data: data
      })
      console.dir(profile, { depth: null, colors: true })

    } catch (error) {
      console.dir(error, { depth: null, colors: true })
      console.error(`Error creating profile for user ${createdUser.email}:`, error)
      return
    }

    console.log(`Created user  with profile ID`)
    console.dir(profile, { depth: null, colors: true })


    const imageUrls = []

    // primary profile image
    imageUrls.push({
      url: faker.image.personPortrait({
        sex: profile.gender as SexType,
        size: 512,
      }),
      cat: 'avatar',
    })

    faker.helpers
      .multiple(
        () =>
          faker.image.urlPicsumPhotos({
            width: 1024,
            height: 768,
          }),
        {
          count: faker.number.int({ min: 1, max: 3 }),
        }
      )
      .forEach(url => {
        imageUrls.push({
          url,
          cat: 'gallery',
        })
      })

    let i = 0
    imageUrls.forEach(async img => {
      const tmpDir = path.join(testImagesDir, img.cat)
      const tmpFile = await downloadImage(img.url, tmpDir)

      console.log(`Downloaded image ${tmpFile} `)

      const f = basename(tmpFile)
      const savedDir = path.join(tmpDir, 'saved')
      await fs.promises.mkdir(savedDir, { recursive: true })
      await fs.promises.copyFile(tmpFile, path.join(savedDir, f))

      const profileImage = await imageService.storeImage(
        createdUser.id,
        tmpFile,
        faker.lorem.sentence({ min: 1, max: 2 })
      )

      try {
        console.log(`Added image ${profileImage.id} `, profileImage)

        profileService.addProfileImage(profile.id, profileImage.id)
      } catch (err) {
        console.error(`Error adding image for user ${createdUser.email}:`, err)
      }

      await new Promise(resolve => setTimeout(resolve, 5000))
    })
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })




async function fetchTags() {
  return await prisma.tag.findMany({
    select: {
      id: true,
    },
  })
}
async function fetchCities() {
  return await prisma.city.findMany({
    select: {
      id: true,
      name: true,
      country: true,
    },
  })
}
