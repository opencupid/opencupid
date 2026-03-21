import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTx, mockPrisma, mockUnlink, mockRm } = vi.hoisted(() => {
  const mockTx = {
    profile: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    likedProfile: { deleteMany: vi.fn() },
    hiddenProfile: { deleteMany: vi.fn() },
    socialMatchFilter: { deleteMany: vi.fn() },
    conversation: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  }

  const mockPrisma = {
    profileImage: { findMany: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  }

  const mockUnlink = vi.fn().mockResolvedValue(undefined)
  const mockRm = vi.fn().mockResolvedValue(undefined)

  return { mockTx, mockPrisma, mockUnlink, mockRm }
})

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }))

vi.mock('../../lib/media', () => ({
  getMediaRoot: vi.fn(() => '/media'),
  imageBasePath: vi.fn((p: string) => `images/${p}`),
  MEDIA_SUBDIR: { IMAGES: 'images' },
}))

vi.mock('fs', () => ({
  default: {
    promises: {
      unlink: (...args: unknown[]) => mockUnlink(...args),
      rm: (...args: unknown[]) => mockRm(...args),
    },
  },
}))

import { UserService } from '../../services/user.service'

describe('UserService.deleteAccount', () => {
  let service: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    ;(UserService as any).instance = undefined
    service = UserService.getInstance()
  })

  it('deletes a user with a profile in a transaction', async () => {
    const profileId = 'profile-123'
    const userId = 'user-123'

    mockPrisma.profileImage.findMany.mockResolvedValue([])
    mockTx.profile.findUnique.mockResolvedValue({ id: profileId })

    await service.deleteAccount(userId)

    expect(mockTx.likedProfile.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ fromId: profileId }, { toId: profileId }] },
    })
    expect(mockTx.hiddenProfile.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ fromId: profileId }, { toId: profileId }] },
    })
    expect(mockTx.socialMatchFilter.deleteMany).toHaveBeenCalledWith({
      where: { profileId },
    })
    expect(mockTx.conversation.deleteMany).toHaveBeenCalledWith({
      where: { initiatorProfileId: profileId },
    })
    expect(mockTx.profile.delete).toHaveBeenCalledWith({ where: { id: profileId } })
    expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: userId } })
  })

  it('skips profile deletion steps if user has no profile', async () => {
    const userId = 'user-no-profile'

    mockPrisma.profileImage.findMany.mockResolvedValue([])
    mockTx.profile.findUnique.mockResolvedValue(null)

    await service.deleteAccount(userId)

    expect(mockTx.likedProfile.deleteMany).not.toHaveBeenCalled()
    expect(mockTx.profile.delete).not.toHaveBeenCalled()
    expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: userId } })
  })

  it('deletes image files from disk for each stored image', async () => {
    const userId = 'user-with-images'
    mockPrisma.profileImage.findMany.mockResolvedValue([{ storagePath: 'user-with-images/img1' }])
    mockTx.profile.findUnique.mockResolvedValue(null)

    await service.deleteAccount(userId)

    expect(mockUnlink).toHaveBeenCalledWith('/media/images/user-with-images/img1-original.jpg')
    expect(mockUnlink).toHaveBeenCalledWith('/media/images/user-with-images/img1-thumb.webp')
  })

  it('removes the user image directory after deletion', async () => {
    const userId = 'user-123'
    mockPrisma.profileImage.findMany.mockResolvedValue([])
    mockTx.profile.findUnique.mockResolvedValue(null)

    await service.deleteAccount(userId)

    expect(mockRm).toHaveBeenCalledWith('/media/images/user-123', {
      recursive: true,
      force: true,
    })
  })
})
