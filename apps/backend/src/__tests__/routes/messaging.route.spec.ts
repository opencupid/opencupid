import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageRoutes, { transcodeToWebm } from '../../api/routes/messaging.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'
import { promises as fsPromises } from 'fs'
import path from 'path'
import os from 'os'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockMessageService: any
let mockWebPushService: any

vi.mock('../../services/messaging.service', () => ({
  MessageService: { getInstance: () => mockMessageService },
}))

vi.mock('../../services/webpush.service', () => ({
  WebPushService: { getInstance: () => mockWebPushService },
}))

vi.mock('../../api/mappers/messaging.mappers', () => ({
  mapMessageForMessageList: vi.fn((m: any) => ({ ...m, mapped: true })),
  mapConversationParticipantToSummary: vi.fn(() => ({ id: 'summary', partnerProfile: {} })),
  mapMessageDTO: vi.fn(() => ({ id: 'dto' })),
}))

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockMessageService = {
    listMessagesForConversation: vi.fn(),
    listConversationsForProfile: vi.fn(),
    markConversationRead: vi.fn(),
    getConversationSummary: vi.fn(),
    initiateConversation: vi.fn(),
    replyInConversation: vi.fn(),
  }
  mockWebPushService = { send: vi.fn() }
  await messageRoutes(fastify as any, {})
})

describe('GET /:id', () => {
  it('returns 404 when session missing', async () => {
    const handler = fastify.routes['GET /:id']
    await handler({ session: {}, params: { id: 'c1' } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(reply.payload.message).toMatch('Profile not found')
  })

  it('returns messages for conversation', async () => {
    const handler = fastify.routes['GET /:id']
    const msg = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'p1',
      content: 'hi',
      createdAt: new Date(),
      sender: { profileImages: [] },
    }
    mockMessageService.listMessagesForConversation.mockResolvedValue({
      messages: [msg],
      nextCursor: null,
      hasMore: false,
    })
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.listMessagesForConversation).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      { cursor: undefined, take: undefined }
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.messages[0].mapped).toBe(true)
    expect(reply.payload.nextCursor).toBeNull()
    expect(reply.payload.hasMore).toBe(false)
  })
})

describe('POST /conversations/:id/mark-read', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    await handler({ session: {}, params: { id: 'c1' } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when conversation not found', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.getConversationSummary.mockResolvedValue(null)
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.markConversationRead).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'p1'
    )
    expect(reply.statusCode).toBe(404)
  })

  it('marks conversation read and returns summary', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.getConversationSummary.mockResolvedValue({})
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.markConversationRead).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'p1'
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.conversation.id).toBe('summary')
  })
})

describe('transcodeToWebm', () => {
  it('transcodes a WAV file to webm and removes the original', async () => {
    // Create a minimal valid WAV file (44-byte header + 0 data bytes)
    const header = Buffer.alloc(44)
    // RIFF header
    header.write('RIFF', 0)
    header.writeUInt32LE(36, 4) // file size - 8
    header.write('WAVE', 8)
    // fmt sub-chunk
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16) // sub-chunk size
    header.writeUInt16LE(1, 20) // PCM format
    header.writeUInt16LE(1, 22) // mono
    header.writeUInt32LE(48000, 24) // sample rate
    header.writeUInt32LE(96000, 28) // byte rate
    header.writeUInt16LE(2, 32) // block align
    header.writeUInt16LE(16, 34) // bits per sample
    // data sub-chunk (empty)
    header.write('data', 36)
    header.writeUInt32LE(0, 40)

    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'transcode-test-'))
    const wavPath = path.join(tmpDir, 'test.wav')
    await fsPromises.writeFile(wavPath, header)

    const result = await transcodeToWebm(wavPath)

    expect(result.path).toBe(path.join(tmpDir, 'test.webm'))
    expect(result.size).toBeGreaterThan(0)

    // Original WAV should be deleted
    await expect(fsPromises.access(wavPath)).rejects.toThrow()

    // webm file should exist
    await expect(fsPromises.access(result.path)).resolves.toBeUndefined()

    // Cleanup
    await fsPromises.rm(tmpDir, { recursive: true })
  })
})
