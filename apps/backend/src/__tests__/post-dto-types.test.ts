import { describe, it, expectTypeOf } from 'vitest'
import type {
  PublicPost,
  PublicPostWithProfile,
  OwnerPost,
  PublicPostDetail,
  PostSummary,
  CreatePostPayload,
  UpdatePostPayload,
  PostQuery,
  NearbyPostQuery,
} from '@zod/post/post.dto'

/**
 * Pin the structural shape of each Post DTO. If a field is added or removed
 * from any of these wire-contract types, this test fails — surfacing the
 * wire-format change explicitly and forcing an update here.
 *
 * These assertions are evaluated at type-check time; the runtime body is
 * intentionally trivial.
 */
describe('post.dto type contracts', () => {
  it('PublicPost keyset', () => {
    expectTypeOf<keyof PublicPost>().toEqualTypeOf<
      | 'id'
      | 'content'
      | 'type'
      | 'createdAt'
      | 'updatedAt'
      | 'postedById'
      | 'country'
      | 'cityName'
      | 'lat'
      | 'lon'
      | 'isOwn'
    >()
  })

  it('PublicPostWithProfile keyset', () => {
    expectTypeOf<keyof PublicPostWithProfile>().toEqualTypeOf<
      keyof PublicPost | 'postedBy' | 'location'
    >()
  })

  it('OwnerPost keyset includes visibility flags', () => {
    expectTypeOf<keyof OwnerPost>().toEqualTypeOf<
      keyof PublicPostWithProfile | 'isVisible' | 'isDeleted'
    >()
  })

  it('PublicPostDetail keyset matches PublicPostWithProfile', () => {
    expectTypeOf<keyof PublicPostDetail>().toEqualTypeOf<keyof PublicPostWithProfile>()
  })

  it('PostSummary keyset', () => {
    expectTypeOf<keyof PostSummary>().toEqualTypeOf<
      'id' | 'content' | 'type' | 'location' | 'postedBy'
    >()
  })

  it('CreatePostPayload keyset', () => {
    expectTypeOf<keyof CreatePostPayload>().toEqualTypeOf<
      'content' | 'type' | 'country' | 'cityName' | 'lat' | 'lon'
    >()
  })

  it('UpdatePostPayload keyset', () => {
    expectTypeOf<keyof UpdatePostPayload>().toEqualTypeOf<
      'content' | 'type' | 'isVisible' | 'country' | 'cityName' | 'lat' | 'lon'
    >()
  })

  it('PostQuery keyset', () => {
    expectTypeOf<keyof PostQuery>().toEqualTypeOf<'type' | 'limit' | 'offset'>()
  })

  it('NearbyPostQuery keyset', () => {
    expectTypeOf<keyof NearbyPostQuery>().toEqualTypeOf<
      keyof PostQuery | 'lat' | 'lon' | 'radius'
    >()
  })
})
