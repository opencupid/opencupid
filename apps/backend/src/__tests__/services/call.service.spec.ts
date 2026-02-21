import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/call.service')
  ;(module.CallService as any).instance = undefined
  service = module.CallService.getInstance()
})

describe('CallService', () => {
  describe('initiateCall', () => {
    it('returns roomName and calleeProfileId for valid call', async () => {
      const tx: any = {
        conversation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'c1',
            status: 'ACCEPTED',
            participants: [
              {
                profileId: 'caller',
                isCallable: true,
                profile: { publicName: 'Alice', isCallable: true },
              },
              {
                profileId: 'callee',
                isCallable: true,
                profile: { publicName: 'Bob', isCallable: true },
              },
            ],
          }),
          update: vi.fn(),
        },
      }

      const result = await service.initiateCall(tx, 'c1', 'caller')
      expect(result.roomName).toBeDefined()
      expect(result.calleeProfileId).toBe('callee')
      expect(result.callerPublicName).toBe('Alice')
      expect(tx.conversation.update).toHaveBeenCalled()
    })

    it('throws when conversation not found', async () => {
      const tx: any = {
        conversation: { findUnique: vi.fn().mockResolvedValue(null) },
      }
      await expect(service.initiateCall(tx, 'c1', 'caller')).rejects.toEqual(
        expect.objectContaining({ code: 'NOT_FOUND' })
      )
    })

    it('throws when conversation not accepted', async () => {
      const tx: any = {
        conversation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'c1',
            status: 'INITIATED',
            participants: [],
          }),
        },
      }
      await expect(service.initiateCall(tx, 'c1', 'caller')).rejects.toEqual(
        expect.objectContaining({ code: 'CONVERSATION_NOT_ACCEPTED' })
      )
    })

    it('throws when partner is not callable', async () => {
      const tx: any = {
        conversation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'c1',
            status: 'ACCEPTED',
            participants: [
              {
                profileId: 'caller',
                isCallable: true,
                profile: { publicName: 'Alice', isCallable: true },
              },
              {
                profileId: 'callee',
                isCallable: false,
                profile: { publicName: 'Bob', isCallable: true },
              },
            ],
          }),
        },
      }
      await expect(service.initiateCall(tx, 'c1', 'caller')).rejects.toEqual(
        expect.objectContaining({ code: 'NOT_CALLABLE' })
      )
    })
  })

  describe('insertMissedCallMessage', () => {
    it('creates a missed call message', async () => {
      const tx: any = {
        message: { create: vi.fn().mockResolvedValue({ id: 'm1' }) },
      }
      const result = await service.insertMissedCallMessage(tx, 'c1', 'caller')
      expect(tx.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'c1',
          senderId: 'caller',
          content: 'Missed call',
          messageType: 'call/missed',
        },
      })
      expect(result.id).toBe('m1')
    })
  })

  describe('updateCallableStatus', () => {
    it('updates conversation participant callable status', async () => {
      mockPrisma.conversationParticipant.update.mockResolvedValue({ id: 'cp1', isCallable: false })
      const result = await service.updateCallableStatus('c1', 'p1', false)
      expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith({
        where: { profileId_conversationId: { profileId: 'p1', conversationId: 'c1' } },
        data: { isCallable: false },
      })
    })
  })
})
