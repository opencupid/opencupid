import slugify from 'slugify'
import { prisma } from '../lib/prisma'
import { Tag } from '@zod/generated'
import { CreateTagInput } from '@zod/tag/tag.dto'
import { TagWithTranslations } from '@zod/tag/tag.db'

function translationWhereClause(term: string, locale: string) {
  return {
    translations: {
      some: {
        locale,
        name: {
          contains: term,
          mode: 'insensitive' as const,
        },
      },
    },
  }
}

function includeTranslations(locale: string) {
  return {
    translations: true
  }
}
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
      include: includeTranslations(locale),
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
        isApproved: true,
        isUserCreated: data.isUserCreated,
        translations: {
          create: {
            locale,
            name: data.name,
          },
        },
      },
      include: includeTranslations(locale),
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
