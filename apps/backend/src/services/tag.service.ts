import slugify from 'slugify'
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
    cityName?: string
    locale?: string
  }): Promise<PopularTag[]> {
    const limit = opts.limit ?? 50

    const profileWhere: Record<string, unknown> = {}
    if (opts.country) profileWhere.country = opts.country
    if (opts.cityName) profileWhere.cityName = opts.cityName

    const tags = await prisma.tag.findMany({
      where: {
        isApproved: true,
        isHidden: false,
        isDeleted: false,
        profiles: { some: profileWhere },
      },
      include: {
        _count: { select: { profiles: { where: profileWhere } } },
        translations: opts.locale ? { where: { locale: opts.locale } } : true,
      },
      orderBy: { profiles: { _count: 'desc' } },
    })

    return tags
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
