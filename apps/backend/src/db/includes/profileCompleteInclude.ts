import { Prisma } from "@prisma/client"

export function profileImageInclude() {
  return {
    profileImages: {
      orderBy: { position: 'asc' },
    },
  } satisfies Prisma.ProfileInclude
}

export function profileCompleteInclude() {
  const clause = {
    profileImages: {
      orderBy: { position: 'asc' },
    },
    tags: {
      include: {
        tag: {
          include: {
            translations: {
              // where: { locale: 'de' },
              select: { name: true, locale: true },
            },
          }
        },
      },
    },
    localized: true,

  } satisfies Prisma.ProfileInclude

  return clause
}

