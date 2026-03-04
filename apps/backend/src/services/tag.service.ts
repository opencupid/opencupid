import slugify from 'slugify'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { Tag } from '@zod/generated'
import { CreateTagInput, type PopularTag } from '@zod/tag/tag.dto'
import { TagWithTranslations } from '@zod/tag/tag.db'
import { tagTranslationsInclude, translationWhereClause } from '@/db/includes/profileIncludes'

export class TagService {
  private static instance: TagService

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): TagService {
    if (!TagService.instance) {
      TagService.instance = new TagService()
    }
    return TagService.instance
  }

  // Service functions
  public async findAll(): Promise<Tag[]> {
    return prisma.tag.findMany({ where: { isDeleted: false } })
  }

  public async findById(id: string): Promise<Tag | null> {
    return prisma.tag.findFirst({ where: { id, isDeleted: false } })
  }

  /**
   * Find tags whose name contains the given substring (case-insensitive).
   */
  public async search(term: string, locale: string): Promise<TagWithTranslations[]> {
    // use locale
    const where = {
      where: {
        name: { contains: term, mode: 'insensitive' },
        isDeleted: false,
        isApproved: true,
        isHidden: false,
        ...translationWhereClause(term, locale),
      },
    }
    return prisma.tag.findMany({
      where: {
        isDeleted: false,
        isApproved: true,
        isHidden: false,
        ...translationWhereClause(term, locale),
      },
      include: tagTranslationsInclude(locale),
      take: 20, // limit results for performance
      orderBy: {
        name: 'asc',
      },
    })
  }

  public async create(locale: string, data: CreateTagInput): Promise<TagWithTranslations> {
    const slug = slugify(data.name, { lower: true, strict: true })
    try {
      const tag = await prisma.tag.create({
        data: {
          name: data.name,
          slug,
          createdBy: data.createdBy,
          originalLocale: data.originalLocale ?? locale,
          isApproved: true,
          isUserCreated: data.isUserCreated,
          translations: {
            create: {
              locale,
              name: data.name,
            },
          },
        },
        include: tagTranslationsInclude(locale),
      })
      return tag
    } catch (err) {
      // P2002 = unique constraint violation on slug or name.
      // Return the existing tag instead of failing — makes creation idempotent.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await prisma.tag.findFirst({
          where: {
            OR: [{ slug }, { name: data.name }],
            isDeleted: false,
          },
          include: tagTranslationsInclude(locale),
        })
        if (existing) return existing
      }
      throw err
    }
  }

  public async update(id: string, data: Tag): Promise<Tag> {
    const updateData: Partial<Tag & { slug: string }> = { ...data }
    if (data.name) {
      updateData.slug = slugify(data.name, {
        lower: true,
        strict: true,
      })
    }
    return prisma.tag.update({
      where: { id },
      data: updateData,
    })
  }

  public async getPopularTags(opts: {
    limit?: number
    country?: string
    locale?: string
  }): Promise<PopularTag[]> {
    const limit = opts.limit ?? 50

    const hasLocationFilter = Boolean(opts.country)
    const baseWhere: Prisma.TagWhereInput = {
      isApproved: true,
      isHidden: false,
      isDeleted: false,
    }
    const translationsInclude = opts.locale ? { where: { locale: opts.locale } } : true

    const tags = hasLocationFilter
      ? await prisma.tag.findMany({
          where: {
            ...baseWhere,
            profiles: {
              some: {
                country: opts.country,
              },
            },
          },
          include: {
            _count: {
              select: {
                profiles: {
                  where: {
                    country: opts.country,
                  },
                },
              },
            },
            translations: translationsInclude,
          },
        })
      : await prisma.tag.findMany({
          where: baseWhere,
          include: {
            _count: { select: { profiles: true } },
            translations: translationsInclude,
          },
        })

    return tags
      .sort((a, b) => b._count.profiles - a._count.profiles)
      .filter((tag) => tag._count.profiles >= 2)
      .slice(0, limit)
      .map((tag) => {
        const translation = opts.locale
          ? tag.translations.find((t) => t.locale === opts.locale)
          : undefined
        return {
          id: tag.id,
          name: translation?.name ?? tag.name,
          slug: tag.slug,
          count: tag._count.profiles,
        }
      })
  }

  public async remove(id: string): Promise<void> {
    // soft delete
    await prisma.tag.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    })
  }
}
