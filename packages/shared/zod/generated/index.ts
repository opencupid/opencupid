import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const CityScalarFieldEnumSchema = z.enum(['id','name','country','lat','lon','isUserCreated','isApproved','isHidden','isDeleted','createdBy','createdAt','updatedAt']);

export const TagScalarFieldEnumSchema = z.enum(['id','slug','name','isUserCreated','isApproved','isHidden','isDeleted','createdBy','createdAt','updatedAt']);

export const TagTranslationScalarFieldEnumSchema = z.enum(['id','tagId','locale','name']);

export const ProfileTagScalarFieldEnumSchema = z.enum(['id','tagId','profileId']);

export const ConnectionRequestScalarFieldEnumSchema = z.enum(['id','fromUserId','toUserId','scope','status','createdAt']);

export const UserScalarFieldEnumSchema = z.enum(['id','email','phonenumber','tokenVersion','loginToken','loginTokenExp','isOnboarded','isActive','isBlocked','isRegistrationConfirmed','hasActiveProfile','createdAt','updatedAt','lastLoginAt','language','roles']);

export const ProfileScalarFieldEnumSchema = z.enum(['id','publicName','country','cityName','cityId','introSocial','isSocialActive','isDatingActive','isActive','isReported','isBlocked','isOnboarded','userId','work','languages','introDating','birthday','gender','pronouns','relationship','hasKids','prefAgeMin','prefAgeMax','prefGender','prefKids','createdAt','updatedAt']);

export const DatingPreferencesScalarFieldEnumSchema = z.enum(['profileId','prefAgeMin','prefAgeMax','prefGender','prefKids']);

export const LocalizedProfileFieldScalarFieldEnumSchema = z.enum(['id','profileId','field','locale','value']);

export const ProfileImageScalarFieldEnumSchema = z.enum(['id','userId','profileId','position','altText','storagePath','url','width','height','mimeType','createdAt','updatedAt','contentHash','isModerated','isFlagged']);

export const ConversationScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt','profileAId','profileBId','status','initiatorProfileId']);

export const ConversationParticipantScalarFieldEnumSchema = z.enum(['id','profileId','conversationId','lastReadAt','isMuted','isArchived']);

export const MessageScalarFieldEnumSchema = z.enum(['id','conversationId','senderId','content','createdAt']);

export const PushSubscriptionScalarFieldEnumSchema = z.enum(['id','userId','endpoint','p256dh','auth','createdAt','updatedAt','deviceInfo','lastSeen']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const ConnectionTypeSchema = z.enum(['friend','dating']);

export type ConnectionTypeType = `${z.infer<typeof ConnectionTypeSchema>}`

export const ConnectionStatusSchema = z.enum(['pending','accepted','rejected','blocked']);

export type ConnectionStatusType = `${z.infer<typeof ConnectionStatusSchema>}`

export const GenderSchema = z.enum(['male','female','agender','androgynous','bigender','cis_man','cis_woman','genderfluid','genderqueer','gender_nonconforming','hijra','intersex','pangender','transfeminine','trans_man','transmasculine','transsexual','trans_woman','two_spirit','non_binary','other','unspecified']);

export type GenderType = `${z.infer<typeof GenderSchema>}`

export const PronounsSchema = z.enum(['he_him','she_her','they_them','unspecified']);

export type PronounsType = `${z.infer<typeof PronounsSchema>}`

export const HasKidsSchema = z.enum(['yes','no','unspecified']);

export type HasKidsType = `${z.infer<typeof HasKidsSchema>}`

export const RelationshipStatusSchema = z.enum(['single','in_relationship','married','divorced','widowed','other','unspecified']);

export type RelationshipStatusType = `${z.infer<typeof RelationshipStatusSchema>}`

export const UserRoleSchema = z.enum(['user','user_dating','admin','moderator']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export const ConversationStatusSchema = z.enum(['INITIATED','ACCEPTED','BLOCKED','ARCHIVED']);

export type ConversationStatusType = `${z.infer<typeof ConversationStatusSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// CITY SCHEMA
/////////////////////////////////////////

export const CitySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  country: z.string(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  isUserCreated: z.boolean(),
  isApproved: z.boolean(),
  isHidden: z.boolean(),
  isDeleted: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type City = z.infer<typeof CitySchema>

/////////////////////////////////////////
// TAG SCHEMA
/////////////////////////////////////////

export const TagSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean(),
  isApproved: z.boolean(),
  isHidden: z.boolean(),
  isDeleted: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Tag = z.infer<typeof TagSchema>

/////////////////////////////////////////
// TAG TRANSLATION SCHEMA
/////////////////////////////////////////

export const TagTranslationSchema = z.object({
  id: z.number().int(),
  tagId: z.string(),
  locale: z.string(),
  name: z.string(),
})

export type TagTranslation = z.infer<typeof TagTranslationSchema>

/////////////////////////////////////////
// PROFILE TAG SCHEMA
/////////////////////////////////////////

export const ProfileTagSchema = z.object({
  id: z.string().cuid(),
  tagId: z.string(),
  profileId: z.string().nullable(),
})

export type ProfileTag = z.infer<typeof ProfileTagSchema>

/////////////////////////////////////////
// CONNECTION REQUEST SCHEMA
/////////////////////////////////////////

export const ConnectionRequestSchema = z.object({
  scope: ConnectionTypeSchema,
  status: ConnectionStatusSchema,
  id: z.string().cuid(),
  fromUserId: z.string(),
  toUserId: z.string(),
  createdAt: z.coerce.date(),
})

export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  roles: UserRoleSchema.array(),
  id: z.string().cuid(),
  email: z.string().nullable(),
  phonenumber: z.string().nullable(),
  tokenVersion: z.number().int(),
  loginToken: z.string().nullable(),
  loginTokenExp: z.coerce.date().nullable(),
  isOnboarded: z.boolean(),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
  isRegistrationConfirmed: z.boolean(),
  hasActiveProfile: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastLoginAt: z.coerce.date().nullable(),
  language: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// PROFILE SCHEMA
/////////////////////////////////////////

export const ProfileSchema = z.object({
  gender: GenderSchema.nullable(),
  pronouns: PronounsSchema.nullable(),
  relationship: RelationshipStatusSchema.nullable(),
  hasKids: HasKidsSchema.nullable(),
  prefGender: GenderSchema.array(),
  prefKids: HasKidsSchema.array(),
  id: z.string().cuid(),
  publicName: z.string(),
  country: z.string(),
  cityName: z.string(),
  cityId: z.string().nullable(),
  introSocial: z.string(),
  isSocialActive: z.boolean(),
  isDatingActive: z.boolean(),
  isActive: z.boolean(),
  isReported: z.boolean(),
  isBlocked: z.boolean(),
  isOnboarded: z.boolean(),
  userId: z.string(),
  work: z.string(),
  languages: z.string().array(),
  introDating: z.string(),
  birthday: z.coerce.date().nullable(),
  prefAgeMin: z.number().int().nullable(),
  prefAgeMax: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Profile = z.infer<typeof ProfileSchema>

/////////////////////////////////////////
// DATING PREFERENCES SCHEMA
/////////////////////////////////////////

export const DatingPreferencesSchema = z.object({
  prefGender: GenderSchema.array(),
  prefKids: HasKidsSchema.array(),
  profileId: z.string(),
  prefAgeMin: z.number().int().nullable(),
  prefAgeMax: z.number().int().nullable(),
})

export type DatingPreferences = z.infer<typeof DatingPreferencesSchema>

/////////////////////////////////////////
// LOCALIZED PROFILE FIELD SCHEMA
/////////////////////////////////////////

export const LocalizedProfileFieldSchema = z.object({
  id: z.string().cuid(),
  profileId: z.string(),
  field: z.string(),
  locale: z.string(),
  value: z.string(),
})

export type LocalizedProfileField = z.infer<typeof LocalizedProfileFieldSchema>

/////////////////////////////////////////
// PROFILE IMAGE SCHEMA
/////////////////////////////////////////

export const ProfileImageSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  profileId: z.string().nullable(),
  position: z.number().int(),
  altText: z.string(),
  storagePath: z.string(),
  url: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  contentHash: z.string().nullable(),
  isModerated: z.boolean(),
  isFlagged: z.boolean(),
})

export type ProfileImage = z.infer<typeof ProfileImageSchema>

/////////////////////////////////////////
// CONVERSATION SCHEMA
/////////////////////////////////////////

export const ConversationSchema = z.object({
  status: ConversationStatusSchema,
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  profileAId: z.string(),
  profileBId: z.string(),
  initiatorProfileId: z.string(),
})

export type Conversation = z.infer<typeof ConversationSchema>

/////////////////////////////////////////
// CONVERSATION PARTICIPANT SCHEMA
/////////////////////////////////////////

export const ConversationParticipantSchema = z.object({
  id: z.string().cuid(),
  profileId: z.string(),
  conversationId: z.string(),
  lastReadAt: z.coerce.date().nullable(),
  isMuted: z.boolean(),
  isArchived: z.boolean(),
})

export type ConversationParticipant = z.infer<typeof ConversationParticipantSchema>

/////////////////////////////////////////
// MESSAGE SCHEMA
/////////////////////////////////////////

export const MessageSchema = z.object({
  id: z.string().cuid(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
})

export type Message = z.infer<typeof MessageSchema>

/////////////////////////////////////////
// PUSH SUBSCRIPTION SCHEMA
/////////////////////////////////////////

export const PushSubscriptionSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deviceInfo: z.string().nullable(),
  lastSeen: z.coerce.date().nullable(),
})

export type PushSubscription = z.infer<typeof PushSubscriptionSchema>

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// CITY
//------------------------------------------------------

export const CityIncludeSchema: z.ZodType<Prisma.CityInclude> = z.object({
  profiles: z.union([z.boolean(),z.lazy(() => ProfileFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => CityCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const CityArgsSchema: z.ZodType<Prisma.CityDefaultArgs> = z.object({
  select: z.lazy(() => CitySelectSchema).optional(),
  include: z.lazy(() => CityIncludeSchema).optional(),
}).strict();

export const CityCountOutputTypeArgsSchema: z.ZodType<Prisma.CityCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => CityCountOutputTypeSelectSchema).nullish(),
}).strict();

export const CityCountOutputTypeSelectSchema: z.ZodType<Prisma.CityCountOutputTypeSelect> = z.object({
  profiles: z.boolean().optional(),
}).strict();

export const CitySelectSchema: z.ZodType<Prisma.CitySelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  country: z.boolean().optional(),
  lat: z.boolean().optional(),
  lon: z.boolean().optional(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  profiles: z.union([z.boolean(),z.lazy(() => ProfileFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => CityCountOutputTypeArgsSchema)]).optional(),
}).strict()

// TAG
//------------------------------------------------------

export const TagIncludeSchema: z.ZodType<Prisma.TagInclude> = z.object({
  translations: z.union([z.boolean(),z.lazy(() => TagTranslationFindManyArgsSchema)]).optional(),
  profileTags: z.union([z.boolean(),z.lazy(() => ProfileTagFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => TagCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const TagArgsSchema: z.ZodType<Prisma.TagDefaultArgs> = z.object({
  select: z.lazy(() => TagSelectSchema).optional(),
  include: z.lazy(() => TagIncludeSchema).optional(),
}).strict();

export const TagCountOutputTypeArgsSchema: z.ZodType<Prisma.TagCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => TagCountOutputTypeSelectSchema).nullish(),
}).strict();

export const TagCountOutputTypeSelectSchema: z.ZodType<Prisma.TagCountOutputTypeSelect> = z.object({
  translations: z.boolean().optional(),
  profileTags: z.boolean().optional(),
}).strict();

export const TagSelectSchema: z.ZodType<Prisma.TagSelect> = z.object({
  id: z.boolean().optional(),
  slug: z.boolean().optional(),
  name: z.boolean().optional(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  translations: z.union([z.boolean(),z.lazy(() => TagTranslationFindManyArgsSchema)]).optional(),
  profileTags: z.union([z.boolean(),z.lazy(() => ProfileTagFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => TagCountOutputTypeArgsSchema)]).optional(),
}).strict()

// TAG TRANSLATION
//------------------------------------------------------

export const TagTranslationIncludeSchema: z.ZodType<Prisma.TagTranslationInclude> = z.object({
  tag: z.union([z.boolean(),z.lazy(() => TagArgsSchema)]).optional(),
}).strict()

export const TagTranslationArgsSchema: z.ZodType<Prisma.TagTranslationDefaultArgs> = z.object({
  select: z.lazy(() => TagTranslationSelectSchema).optional(),
  include: z.lazy(() => TagTranslationIncludeSchema).optional(),
}).strict();

export const TagTranslationSelectSchema: z.ZodType<Prisma.TagTranslationSelect> = z.object({
  id: z.boolean().optional(),
  tagId: z.boolean().optional(),
  locale: z.boolean().optional(),
  name: z.boolean().optional(),
  tag: z.union([z.boolean(),z.lazy(() => TagArgsSchema)]).optional(),
}).strict()

// PROFILE TAG
//------------------------------------------------------

export const ProfileTagIncludeSchema: z.ZodType<Prisma.ProfileTagInclude> = z.object({
  tag: z.union([z.boolean(),z.lazy(() => TagArgsSchema)]).optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

export const ProfileTagArgsSchema: z.ZodType<Prisma.ProfileTagDefaultArgs> = z.object({
  select: z.lazy(() => ProfileTagSelectSchema).optional(),
  include: z.lazy(() => ProfileTagIncludeSchema).optional(),
}).strict();

export const ProfileTagSelectSchema: z.ZodType<Prisma.ProfileTagSelect> = z.object({
  id: z.boolean().optional(),
  tagId: z.boolean().optional(),
  profileId: z.boolean().optional(),
  tag: z.union([z.boolean(),z.lazy(() => TagArgsSchema)]).optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

// CONNECTION REQUEST
//------------------------------------------------------

export const ConnectionRequestIncludeSchema: z.ZodType<Prisma.ConnectionRequestInclude> = z.object({
  fromUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  toUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

export const ConnectionRequestArgsSchema: z.ZodType<Prisma.ConnectionRequestDefaultArgs> = z.object({
  select: z.lazy(() => ConnectionRequestSelectSchema).optional(),
  include: z.lazy(() => ConnectionRequestIncludeSchema).optional(),
}).strict();

export const ConnectionRequestSelectSchema: z.ZodType<Prisma.ConnectionRequestSelect> = z.object({
  id: z.boolean().optional(),
  fromUserId: z.boolean().optional(),
  toUserId: z.boolean().optional(),
  scope: z.boolean().optional(),
  status: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  fromUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  toUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z.object({
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  ProfileImage: z.union([z.boolean(),z.lazy(() => ProfileImageFindManyArgsSchema)]).optional(),
  requestsSent: z.union([z.boolean(),z.lazy(() => ConnectionRequestFindManyArgsSchema)]).optional(),
  requestsReceived: z.union([z.boolean(),z.lazy(() => ConnectionRequestFindManyArgsSchema)]).optional(),
  pushSubscription: z.union([z.boolean(),z.lazy(() => PushSubscriptionFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const UserArgsSchema: z.ZodType<Prisma.UserDefaultArgs> = z.object({
  select: z.lazy(() => UserSelectSchema).optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
}).strict();

export const UserCountOutputTypeArgsSchema: z.ZodType<Prisma.UserCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserCountOutputTypeSelectSchema).nullish(),
}).strict();

export const UserCountOutputTypeSelectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = z.object({
  ProfileImage: z.boolean().optional(),
  requestsSent: z.boolean().optional(),
  requestsReceived: z.boolean().optional(),
  pushSubscription: z.boolean().optional(),
}).strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  email: z.boolean().optional(),
  phonenumber: z.boolean().optional(),
  tokenVersion: z.boolean().optional(),
  loginToken: z.boolean().optional(),
  loginTokenExp: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  lastLoginAt: z.boolean().optional(),
  language: z.boolean().optional(),
  roles: z.boolean().optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  ProfileImage: z.union([z.boolean(),z.lazy(() => ProfileImageFindManyArgsSchema)]).optional(),
  requestsSent: z.union([z.boolean(),z.lazy(() => ConnectionRequestFindManyArgsSchema)]).optional(),
  requestsReceived: z.union([z.boolean(),z.lazy(() => ConnectionRequestFindManyArgsSchema)]).optional(),
  pushSubscription: z.union([z.boolean(),z.lazy(() => PushSubscriptionFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

// PROFILE
//------------------------------------------------------

export const ProfileIncludeSchema: z.ZodType<Prisma.ProfileInclude> = z.object({
  city: z.union([z.boolean(),z.lazy(() => CityArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  tags: z.union([z.boolean(),z.lazy(() => ProfileTagFindManyArgsSchema)]).optional(),
  profileImages: z.union([z.boolean(),z.lazy(() => ProfileImageFindManyArgsSchema)]).optional(),
  conversationParticipants: z.union([z.boolean(),z.lazy(() => ConversationParticipantFindManyArgsSchema)]).optional(),
  conversationAsA: z.union([z.boolean(),z.lazy(() => ConversationFindManyArgsSchema)]).optional(),
  conversationAsB: z.union([z.boolean(),z.lazy(() => ConversationFindManyArgsSchema)]).optional(),
  Message: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  Conversation: z.union([z.boolean(),z.lazy(() => ConversationFindManyArgsSchema)]).optional(),
  localized: z.union([z.boolean(),z.lazy(() => LocalizedProfileFieldFindManyArgsSchema)]).optional(),
  blockedProfiles: z.union([z.boolean(),z.lazy(() => ProfileFindManyArgsSchema)]).optional(),
  blockedByProfiles: z.union([z.boolean(),z.lazy(() => ProfileFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ProfileCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const ProfileArgsSchema: z.ZodType<Prisma.ProfileDefaultArgs> = z.object({
  select: z.lazy(() => ProfileSelectSchema).optional(),
  include: z.lazy(() => ProfileIncludeSchema).optional(),
}).strict();

export const ProfileCountOutputTypeArgsSchema: z.ZodType<Prisma.ProfileCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ProfileCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ProfileCountOutputTypeSelectSchema: z.ZodType<Prisma.ProfileCountOutputTypeSelect> = z.object({
  tags: z.boolean().optional(),
  profileImages: z.boolean().optional(),
  conversationParticipants: z.boolean().optional(),
  conversationAsA: z.boolean().optional(),
  conversationAsB: z.boolean().optional(),
  Message: z.boolean().optional(),
  Conversation: z.boolean().optional(),
  localized: z.boolean().optional(),
  blockedProfiles: z.boolean().optional(),
  blockedByProfiles: z.boolean().optional(),
}).strict();

export const ProfileSelectSchema: z.ZodType<Prisma.ProfileSelect> = z.object({
  id: z.boolean().optional(),
  publicName: z.boolean().optional(),
  country: z.boolean().optional(),
  cityName: z.boolean().optional(),
  cityId: z.boolean().optional(),
  introSocial: z.boolean().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.boolean().optional(),
  work: z.boolean().optional(),
  languages: z.boolean().optional(),
  introDating: z.boolean().optional(),
  birthday: z.boolean().optional(),
  gender: z.boolean().optional(),
  pronouns: z.boolean().optional(),
  relationship: z.boolean().optional(),
  hasKids: z.boolean().optional(),
  prefAgeMin: z.boolean().optional(),
  prefAgeMax: z.boolean().optional(),
  prefGender: z.boolean().optional(),
  prefKids: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  city: z.union([z.boolean(),z.lazy(() => CityArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  tags: z.union([z.boolean(),z.lazy(() => ProfileTagFindManyArgsSchema)]).optional(),
  profileImages: z.union([z.boolean(),z.lazy(() => ProfileImageFindManyArgsSchema)]).optional(),
  conversationParticipants: z.union([z.boolean(),z.lazy(() => ConversationParticipantFindManyArgsSchema)]).optional(),
  conversationAsA: z.union([z.boolean(),z.lazy(() => ConversationFindManyArgsSchema)]).optional(),
  conversationAsB: z.union([z.boolean(),z.lazy(() => ConversationFindManyArgsSchema)]).optional(),
  Message: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  Conversation: z.union([z.boolean(),z.lazy(() => ConversationFindManyArgsSchema)]).optional(),
  localized: z.union([z.boolean(),z.lazy(() => LocalizedProfileFieldFindManyArgsSchema)]).optional(),
  blockedProfiles: z.union([z.boolean(),z.lazy(() => ProfileFindManyArgsSchema)]).optional(),
  blockedByProfiles: z.union([z.boolean(),z.lazy(() => ProfileFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ProfileCountOutputTypeArgsSchema)]).optional(),
}).strict()

// DATING PREFERENCES
//------------------------------------------------------

export const DatingPreferencesSelectSchema: z.ZodType<Prisma.DatingPreferencesSelect> = z.object({
  profileId: z.boolean().optional(),
  prefAgeMin: z.boolean().optional(),
  prefAgeMax: z.boolean().optional(),
  prefGender: z.boolean().optional(),
  prefKids: z.boolean().optional(),
}).strict()

// LOCALIZED PROFILE FIELD
//------------------------------------------------------

export const LocalizedProfileFieldIncludeSchema: z.ZodType<Prisma.LocalizedProfileFieldInclude> = z.object({
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

export const LocalizedProfileFieldArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldDefaultArgs> = z.object({
  select: z.lazy(() => LocalizedProfileFieldSelectSchema).optional(),
  include: z.lazy(() => LocalizedProfileFieldIncludeSchema).optional(),
}).strict();

export const LocalizedProfileFieldSelectSchema: z.ZodType<Prisma.LocalizedProfileFieldSelect> = z.object({
  id: z.boolean().optional(),
  profileId: z.boolean().optional(),
  field: z.boolean().optional(),
  locale: z.boolean().optional(),
  value: z.boolean().optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

// PROFILE IMAGE
//------------------------------------------------------

export const ProfileImageIncludeSchema: z.ZodType<Prisma.ProfileImageInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

export const ProfileImageArgsSchema: z.ZodType<Prisma.ProfileImageDefaultArgs> = z.object({
  select: z.lazy(() => ProfileImageSelectSchema).optional(),
  include: z.lazy(() => ProfileImageIncludeSchema).optional(),
}).strict();

export const ProfileImageSelectSchema: z.ZodType<Prisma.ProfileImageSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  profileId: z.boolean().optional(),
  position: z.boolean().optional(),
  altText: z.boolean().optional(),
  storagePath: z.boolean().optional(),
  url: z.boolean().optional(),
  width: z.boolean().optional(),
  height: z.boolean().optional(),
  mimeType: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  contentHash: z.boolean().optional(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

// CONVERSATION
//------------------------------------------------------

export const ConversationIncludeSchema: z.ZodType<Prisma.ConversationInclude> = z.object({
  profileA: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  profileB: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  participants: z.union([z.boolean(),z.lazy(() => ConversationParticipantFindManyArgsSchema)]).optional(),
  messages: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  initiator: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ConversationCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const ConversationArgsSchema: z.ZodType<Prisma.ConversationDefaultArgs> = z.object({
  select: z.lazy(() => ConversationSelectSchema).optional(),
  include: z.lazy(() => ConversationIncludeSchema).optional(),
}).strict();

export const ConversationCountOutputTypeArgsSchema: z.ZodType<Prisma.ConversationCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ConversationCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ConversationCountOutputTypeSelectSchema: z.ZodType<Prisma.ConversationCountOutputTypeSelect> = z.object({
  participants: z.boolean().optional(),
  messages: z.boolean().optional(),
}).strict();

export const ConversationSelectSchema: z.ZodType<Prisma.ConversationSelect> = z.object({
  id: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  profileAId: z.boolean().optional(),
  profileBId: z.boolean().optional(),
  status: z.boolean().optional(),
  initiatorProfileId: z.boolean().optional(),
  profileA: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  profileB: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  participants: z.union([z.boolean(),z.lazy(() => ConversationParticipantFindManyArgsSchema)]).optional(),
  messages: z.union([z.boolean(),z.lazy(() => MessageFindManyArgsSchema)]).optional(),
  initiator: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ConversationCountOutputTypeArgsSchema)]).optional(),
}).strict()

// CONVERSATION PARTICIPANT
//------------------------------------------------------

export const ConversationParticipantIncludeSchema: z.ZodType<Prisma.ConversationParticipantInclude> = z.object({
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  conversation: z.union([z.boolean(),z.lazy(() => ConversationArgsSchema)]).optional(),
}).strict()

export const ConversationParticipantArgsSchema: z.ZodType<Prisma.ConversationParticipantDefaultArgs> = z.object({
  select: z.lazy(() => ConversationParticipantSelectSchema).optional(),
  include: z.lazy(() => ConversationParticipantIncludeSchema).optional(),
}).strict();

export const ConversationParticipantSelectSchema: z.ZodType<Prisma.ConversationParticipantSelect> = z.object({
  id: z.boolean().optional(),
  profileId: z.boolean().optional(),
  conversationId: z.boolean().optional(),
  lastReadAt: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  profile: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
  conversation: z.union([z.boolean(),z.lazy(() => ConversationArgsSchema)]).optional(),
}).strict()

// MESSAGE
//------------------------------------------------------

export const MessageIncludeSchema: z.ZodType<Prisma.MessageInclude> = z.object({
  conversation: z.union([z.boolean(),z.lazy(() => ConversationArgsSchema)]).optional(),
  sender: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

export const MessageArgsSchema: z.ZodType<Prisma.MessageDefaultArgs> = z.object({
  select: z.lazy(() => MessageSelectSchema).optional(),
  include: z.lazy(() => MessageIncludeSchema).optional(),
}).strict();

export const MessageSelectSchema: z.ZodType<Prisma.MessageSelect> = z.object({
  id: z.boolean().optional(),
  conversationId: z.boolean().optional(),
  senderId: z.boolean().optional(),
  content: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  conversation: z.union([z.boolean(),z.lazy(() => ConversationArgsSchema)]).optional(),
  sender: z.union([z.boolean(),z.lazy(() => ProfileArgsSchema)]).optional(),
}).strict()

// PUSH SUBSCRIPTION
//------------------------------------------------------

export const PushSubscriptionIncludeSchema: z.ZodType<Prisma.PushSubscriptionInclude> = z.object({
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

export const PushSubscriptionArgsSchema: z.ZodType<Prisma.PushSubscriptionDefaultArgs> = z.object({
  select: z.lazy(() => PushSubscriptionSelectSchema).optional(),
  include: z.lazy(() => PushSubscriptionIncludeSchema).optional(),
}).strict();

export const PushSubscriptionSelectSchema: z.ZodType<Prisma.PushSubscriptionSelect> = z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  endpoint: z.boolean().optional(),
  p256dh: z.boolean().optional(),
  auth: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  deviceInfo: z.boolean().optional(),
  lastSeen: z.boolean().optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const CityWhereInputSchema: z.ZodType<Prisma.CityWhereInput> = z.object({
  AND: z.union([ z.lazy(() => CityWhereInputSchema),z.lazy(() => CityWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CityWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CityWhereInputSchema),z.lazy(() => CityWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lat: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lon: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  isUserCreated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isApproved: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isHidden: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDeleted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  profiles: z.lazy(() => ProfileListRelationFilterSchema).optional()
}).strict();

export const CityOrderByWithRelationInputSchema: z.ZodType<Prisma.CityOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  lat: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lon: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  profiles: z.lazy(() => ProfileOrderByRelationAggregateInputSchema).optional()
}).strict();

export const CityWhereUniqueInputSchema: z.ZodType<Prisma.CityWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => CityWhereInputSchema),z.lazy(() => CityWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => CityWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CityWhereInputSchema),z.lazy(() => CityWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lat: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  lon: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  isUserCreated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isApproved: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isHidden: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDeleted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  profiles: z.lazy(() => ProfileListRelationFilterSchema).optional()
}).strict());

export const CityOrderByWithAggregationInputSchema: z.ZodType<Prisma.CityOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  lat: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lon: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => CityCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => CityAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => CityMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => CityMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => CitySumOrderByAggregateInputSchema).optional()
}).strict();

export const CityScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.CityScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => CityScalarWhereWithAggregatesInputSchema),z.lazy(() => CityScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => CityScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => CityScalarWhereWithAggregatesInputSchema),z.lazy(() => CityScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  lat: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  lon: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  isUserCreated: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isApproved: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isHidden: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isDeleted: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const TagWhereInputSchema: z.ZodType<Prisma.TagWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TagWhereInputSchema),z.lazy(() => TagWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagWhereInputSchema),z.lazy(() => TagWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  slug: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isUserCreated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isApproved: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isHidden: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDeleted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  translations: z.lazy(() => TagTranslationListRelationFilterSchema).optional(),
  profileTags: z.lazy(() => ProfileTagListRelationFilterSchema).optional()
}).strict();

export const TagOrderByWithRelationInputSchema: z.ZodType<Prisma.TagOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  slug: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  translations: z.lazy(() => TagTranslationOrderByRelationAggregateInputSchema).optional(),
  profileTags: z.lazy(() => ProfileTagOrderByRelationAggregateInputSchema).optional()
}).strict();

export const TagWhereUniqueInputSchema: z.ZodType<Prisma.TagWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    slug: z.string(),
    name: z.string()
  }),
  z.object({
    id: z.string().cuid(),
    slug: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    slug: z.string(),
    name: z.string(),
  }),
  z.object({
    slug: z.string(),
  }),
  z.object({
    name: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
  AND: z.union([ z.lazy(() => TagWhereInputSchema),z.lazy(() => TagWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagWhereInputSchema),z.lazy(() => TagWhereInputSchema).array() ]).optional(),
  isUserCreated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isApproved: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isHidden: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDeleted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  translations: z.lazy(() => TagTranslationListRelationFilterSchema).optional(),
  profileTags: z.lazy(() => ProfileTagListRelationFilterSchema).optional()
}).strict());

export const TagOrderByWithAggregationInputSchema: z.ZodType<Prisma.TagOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  slug: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => TagCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TagMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TagMinOrderByAggregateInputSchema).optional()
}).strict();

export const TagScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TagScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TagScalarWhereWithAggregatesInputSchema),z.lazy(() => TagScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagScalarWhereWithAggregatesInputSchema),z.lazy(() => TagScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  slug: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  isUserCreated: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isApproved: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isHidden: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isDeleted: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const TagTranslationWhereInputSchema: z.ZodType<Prisma.TagTranslationWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TagTranslationWhereInputSchema),z.lazy(() => TagTranslationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagTranslationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagTranslationWhereInputSchema),z.lazy(() => TagTranslationWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  tagId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  tag: z.union([ z.lazy(() => TagScalarRelationFilterSchema),z.lazy(() => TagWhereInputSchema) ]).optional(),
}).strict();

export const TagTranslationOrderByWithRelationInputSchema: z.ZodType<Prisma.TagTranslationOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  tag: z.lazy(() => TagOrderByWithRelationInputSchema).optional()
}).strict();

export const TagTranslationWhereUniqueInputSchema: z.ZodType<Prisma.TagTranslationWhereUniqueInput> = z.union([
  z.object({
    id: z.number().int(),
    tagId_locale: z.lazy(() => TagTranslationTagIdLocaleCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.number().int(),
  }),
  z.object({
    tagId_locale: z.lazy(() => TagTranslationTagIdLocaleCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.number().int().optional(),
  tagId_locale: z.lazy(() => TagTranslationTagIdLocaleCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => TagTranslationWhereInputSchema),z.lazy(() => TagTranslationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagTranslationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagTranslationWhereInputSchema),z.lazy(() => TagTranslationWhereInputSchema).array() ]).optional(),
  tagId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  tag: z.union([ z.lazy(() => TagScalarRelationFilterSchema),z.lazy(() => TagWhereInputSchema) ]).optional(),
}).strict());

export const TagTranslationOrderByWithAggregationInputSchema: z.ZodType<Prisma.TagTranslationOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => TagTranslationCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => TagTranslationAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TagTranslationMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TagTranslationMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => TagTranslationSumOrderByAggregateInputSchema).optional()
}).strict();

export const TagTranslationScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TagTranslationScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TagTranslationScalarWhereWithAggregatesInputSchema),z.lazy(() => TagTranslationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagTranslationScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagTranslationScalarWhereWithAggregatesInputSchema),z.lazy(() => TagTranslationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  tagId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const ProfileTagWhereInputSchema: z.ZodType<Prisma.ProfileTagWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileTagWhereInputSchema),z.lazy(() => ProfileTagWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileTagWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileTagWhereInputSchema),z.lazy(() => ProfileTagWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  tagId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  tag: z.union([ z.lazy(() => TagScalarRelationFilterSchema),z.lazy(() => TagWhereInputSchema) ]).optional(),
  profile: z.union([ z.lazy(() => ProfileNullableScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional().nullable(),
}).strict();

export const ProfileTagOrderByWithRelationInputSchema: z.ZodType<Prisma.ProfileTagOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  tag: z.lazy(() => TagOrderByWithRelationInputSchema).optional(),
  profile: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional()
}).strict();

export const ProfileTagWhereUniqueInputSchema: z.ZodType<Prisma.ProfileTagWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    profileId_tagId: z.lazy(() => ProfileTagProfileIdTagIdCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    profileId_tagId: z.lazy(() => ProfileTagProfileIdTagIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  profileId_tagId: z.lazy(() => ProfileTagProfileIdTagIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => ProfileTagWhereInputSchema),z.lazy(() => ProfileTagWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileTagWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileTagWhereInputSchema),z.lazy(() => ProfileTagWhereInputSchema).array() ]).optional(),
  tagId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  tag: z.union([ z.lazy(() => TagScalarRelationFilterSchema),z.lazy(() => TagWhereInputSchema) ]).optional(),
  profile: z.union([ z.lazy(() => ProfileNullableScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional().nullable(),
}).strict());

export const ProfileTagOrderByWithAggregationInputSchema: z.ZodType<Prisma.ProfileTagOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => ProfileTagCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ProfileTagMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ProfileTagMinOrderByAggregateInputSchema).optional()
}).strict();

export const ProfileTagScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ProfileTagScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileTagScalarWhereWithAggregatesInputSchema),z.lazy(() => ProfileTagScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileTagScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileTagScalarWhereWithAggregatesInputSchema),z.lazy(() => ProfileTagScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  tagId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const ConnectionRequestWhereInputSchema: z.ZodType<Prisma.ConnectionRequestWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ConnectionRequestWhereInputSchema),z.lazy(() => ConnectionRequestWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConnectionRequestWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConnectionRequestWhereInputSchema),z.lazy(() => ConnectionRequestWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  fromUserId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toUserId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  scope: z.union([ z.lazy(() => EnumConnectionTypeFilterSchema),z.lazy(() => ConnectionTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumConnectionStatusFilterSchema),z.lazy(() => ConnectionStatusSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  fromUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  toUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestOrderByWithRelationInputSchema: z.ZodType<Prisma.ConnectionRequestOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  fromUserId: z.lazy(() => SortOrderSchema).optional(),
  toUserId: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  fromUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  toUser: z.lazy(() => UserOrderByWithRelationInputSchema).optional()
}).strict();

export const ConnectionRequestWhereUniqueInputSchema: z.ZodType<Prisma.ConnectionRequestWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    fromUserId_toUserId_scope: z.lazy(() => ConnectionRequestFromUserIdToUserIdScopeCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    fromUserId_toUserId_scope: z.lazy(() => ConnectionRequestFromUserIdToUserIdScopeCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  fromUserId_toUserId_scope: z.lazy(() => ConnectionRequestFromUserIdToUserIdScopeCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => ConnectionRequestWhereInputSchema),z.lazy(() => ConnectionRequestWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConnectionRequestWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConnectionRequestWhereInputSchema),z.lazy(() => ConnectionRequestWhereInputSchema).array() ]).optional(),
  fromUserId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toUserId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  scope: z.union([ z.lazy(() => EnumConnectionTypeFilterSchema),z.lazy(() => ConnectionTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumConnectionStatusFilterSchema),z.lazy(() => ConnectionStatusSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  fromUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  toUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const ConnectionRequestOrderByWithAggregationInputSchema: z.ZodType<Prisma.ConnectionRequestOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  fromUserId: z.lazy(() => SortOrderSchema).optional(),
  toUserId: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ConnectionRequestCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ConnectionRequestMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ConnectionRequestMinOrderByAggregateInputSchema).optional()
}).strict();

export const ConnectionRequestScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ConnectionRequestScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ConnectionRequestScalarWhereWithAggregatesInputSchema),z.lazy(() => ConnectionRequestScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConnectionRequestScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConnectionRequestScalarWhereWithAggregatesInputSchema),z.lazy(() => ConnectionRequestScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  fromUserId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  toUserId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  scope: z.union([ z.lazy(() => EnumConnectionTypeWithAggregatesFilterSchema),z.lazy(() => ConnectionTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumConnectionStatusWithAggregatesFilterSchema),z.lazy(() => ConnectionStatusSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  phonenumber: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  tokenVersion: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  loginToken: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  loginTokenExp: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  isOnboarded: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isRegistrationConfirmed: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  hasActiveProfile: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  lastLoginAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  language: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  roles: z.lazy(() => EnumUserRoleNullableListFilterSchema).optional(),
  profile: z.union([ z.lazy(() => ProfileNullableScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional().nullable(),
  ProfileImage: z.lazy(() => ProfileImageListRelationFilterSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestListRelationFilterSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestListRelationFilterSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionListRelationFilterSchema).optional()
}).strict();

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  phonenumber: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  tokenVersion: z.lazy(() => SortOrderSchema).optional(),
  loginToken: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  loginTokenExp: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isRegistrationConfirmed: z.lazy(() => SortOrderSchema).optional(),
  hasActiveProfile: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  language: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  roles: z.lazy(() => SortOrderSchema).optional(),
  profile: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageOrderByRelationAggregateInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestOrderByRelationAggregateInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestOrderByRelationAggregateInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionOrderByRelationAggregateInputSchema).optional()
}).strict();

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    email: z.string(),
    phonenumber: z.string(),
    loginToken: z.string()
  }),
  z.object({
    id: z.string().cuid(),
    email: z.string(),
    phonenumber: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
    email: z.string(),
    loginToken: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
    email: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
    phonenumber: z.string(),
    loginToken: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
    phonenumber: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
    loginToken: z.string(),
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    email: z.string(),
    phonenumber: z.string(),
    loginToken: z.string(),
  }),
  z.object({
    email: z.string(),
    phonenumber: z.string(),
  }),
  z.object({
    email: z.string(),
    loginToken: z.string(),
  }),
  z.object({
    email: z.string(),
  }),
  z.object({
    phonenumber: z.string(),
    loginToken: z.string(),
  }),
  z.object({
    phonenumber: z.string(),
  }),
  z.object({
    loginToken: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional(),
  phonenumber: z.string().optional(),
  loginToken: z.string().optional(),
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  tokenVersion: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  loginTokenExp: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  isOnboarded: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isRegistrationConfirmed: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  hasActiveProfile: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  lastLoginAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  language: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  roles: z.lazy(() => EnumUserRoleNullableListFilterSchema).optional(),
  profile: z.union([ z.lazy(() => ProfileNullableScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional().nullable(),
  ProfileImage: z.lazy(() => ProfileImageListRelationFilterSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestListRelationFilterSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestListRelationFilterSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionListRelationFilterSchema).optional()
}).strict());

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  phonenumber: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  tokenVersion: z.lazy(() => SortOrderSchema).optional(),
  loginToken: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  loginTokenExp: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isRegistrationConfirmed: z.lazy(() => SortOrderSchema).optional(),
  hasActiveProfile: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  language: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  roles: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => UserAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => UserSumOrderByAggregateInputSchema).optional()
}).strict();

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema),z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserScalarWhereWithAggregatesInputSchema),z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  phonenumber: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  tokenVersion: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  loginToken: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  loginTokenExp: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  isOnboarded: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isRegistrationConfirmed: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  hasActiveProfile: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  lastLoginAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  language: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  roles: z.lazy(() => EnumUserRoleNullableListFilterSchema).optional()
}).strict();

export const ProfileWhereInputSchema: z.ZodType<Prisma.ProfileWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileWhereInputSchema),z.lazy(() => ProfileWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileWhereInputSchema),z.lazy(() => ProfileWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  publicName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  cityName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  cityId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  introSocial: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isSocialActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDatingActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isReported: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isOnboarded: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  work: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  languages: z.lazy(() => StringNullableListFilterSchema).optional(),
  introDating: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  birthday: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  gender: z.union([ z.lazy(() => EnumGenderNullableFilterSchema),z.lazy(() => GenderSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => EnumPronounsNullableFilterSchema),z.lazy(() => PronounsSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => EnumRelationshipStatusNullableFilterSchema),z.lazy(() => RelationshipStatusSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => EnumHasKidsNullableFilterSchema),z.lazy(() => HasKidsSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  city: z.union([ z.lazy(() => CityNullableScalarRelationFilterSchema),z.lazy(() => CityWhereInputSchema) ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagListRelationFilterSchema).optional(),
  profileImages: z.lazy(() => ProfileImageListRelationFilterSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantListRelationFilterSchema).optional(),
  conversationAsA: z.lazy(() => ConversationListRelationFilterSchema).optional(),
  conversationAsB: z.lazy(() => ConversationListRelationFilterSchema).optional(),
  Message: z.lazy(() => MessageListRelationFilterSchema).optional(),
  Conversation: z.lazy(() => ConversationListRelationFilterSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldListRelationFilterSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileListRelationFilterSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileListRelationFilterSchema).optional()
}).strict();

export const ProfileOrderByWithRelationInputSchema: z.ZodType<Prisma.ProfileOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  publicName: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  cityName: z.lazy(() => SortOrderSchema).optional(),
  cityId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  introSocial: z.lazy(() => SortOrderSchema).optional(),
  isSocialActive: z.lazy(() => SortOrderSchema).optional(),
  isDatingActive: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isReported: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  work: z.lazy(() => SortOrderSchema).optional(),
  languages: z.lazy(() => SortOrderSchema).optional(),
  introDating: z.lazy(() => SortOrderSchema).optional(),
  birthday: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  gender: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  pronouns: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  relationship: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  hasKids: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefAgeMin: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefAgeMax: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefGender: z.lazy(() => SortOrderSchema).optional(),
  prefKids: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  city: z.lazy(() => CityOrderByWithRelationInputSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  tags: z.lazy(() => ProfileTagOrderByRelationAggregateInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageOrderByRelationAggregateInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantOrderByRelationAggregateInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationOrderByRelationAggregateInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationOrderByRelationAggregateInputSchema).optional(),
  Message: z.lazy(() => MessageOrderByRelationAggregateInputSchema).optional(),
  Conversation: z.lazy(() => ConversationOrderByRelationAggregateInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldOrderByRelationAggregateInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileOrderByRelationAggregateInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileOrderByRelationAggregateInputSchema).optional()
}).strict();

export const ProfileWhereUniqueInputSchema: z.ZodType<Prisma.ProfileWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    userId: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    userId: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  userId: z.string().optional(),
  AND: z.union([ z.lazy(() => ProfileWhereInputSchema),z.lazy(() => ProfileWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileWhereInputSchema),z.lazy(() => ProfileWhereInputSchema).array() ]).optional(),
  publicName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  cityName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  cityId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  introSocial: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isSocialActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDatingActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isReported: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isOnboarded: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  work: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  languages: z.lazy(() => StringNullableListFilterSchema).optional(),
  introDating: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  birthday: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  gender: z.union([ z.lazy(() => EnumGenderNullableFilterSchema),z.lazy(() => GenderSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => EnumPronounsNullableFilterSchema),z.lazy(() => PronounsSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => EnumRelationshipStatusNullableFilterSchema),z.lazy(() => RelationshipStatusSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => EnumHasKidsNullableFilterSchema),z.lazy(() => HasKidsSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  city: z.union([ z.lazy(() => CityNullableScalarRelationFilterSchema),z.lazy(() => CityWhereInputSchema) ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagListRelationFilterSchema).optional(),
  profileImages: z.lazy(() => ProfileImageListRelationFilterSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantListRelationFilterSchema).optional(),
  conversationAsA: z.lazy(() => ConversationListRelationFilterSchema).optional(),
  conversationAsB: z.lazy(() => ConversationListRelationFilterSchema).optional(),
  Message: z.lazy(() => MessageListRelationFilterSchema).optional(),
  Conversation: z.lazy(() => ConversationListRelationFilterSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldListRelationFilterSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileListRelationFilterSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileListRelationFilterSchema).optional()
}).strict());

export const ProfileOrderByWithAggregationInputSchema: z.ZodType<Prisma.ProfileOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  publicName: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  cityName: z.lazy(() => SortOrderSchema).optional(),
  cityId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  introSocial: z.lazy(() => SortOrderSchema).optional(),
  isSocialActive: z.lazy(() => SortOrderSchema).optional(),
  isDatingActive: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isReported: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  work: z.lazy(() => SortOrderSchema).optional(),
  languages: z.lazy(() => SortOrderSchema).optional(),
  introDating: z.lazy(() => SortOrderSchema).optional(),
  birthday: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  gender: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  pronouns: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  relationship: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  hasKids: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefAgeMin: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefAgeMax: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefGender: z.lazy(() => SortOrderSchema).optional(),
  prefKids: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ProfileCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => ProfileAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ProfileMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ProfileMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => ProfileSumOrderByAggregateInputSchema).optional()
}).strict();

export const ProfileScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ProfileScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileScalarWhereWithAggregatesInputSchema),z.lazy(() => ProfileScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileScalarWhereWithAggregatesInputSchema),z.lazy(() => ProfileScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  publicName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  cityName: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  cityId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  introSocial: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  isSocialActive: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isDatingActive: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isReported: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isOnboarded: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  work: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  languages: z.lazy(() => StringNullableListFilterSchema).optional(),
  introDating: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  birthday: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  gender: z.union([ z.lazy(() => EnumGenderNullableWithAggregatesFilterSchema),z.lazy(() => GenderSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => EnumPronounsNullableWithAggregatesFilterSchema),z.lazy(() => PronounsSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => EnumRelationshipStatusNullableWithAggregatesFilterSchema),z.lazy(() => RelationshipStatusSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => EnumHasKidsNullableWithAggregatesFilterSchema),z.lazy(() => HasKidsSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const DatingPreferencesWhereInputSchema: z.ZodType<Prisma.DatingPreferencesWhereInput> = z.object({
  AND: z.union([ z.lazy(() => DatingPreferencesWhereInputSchema),z.lazy(() => DatingPreferencesWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DatingPreferencesWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DatingPreferencesWhereInputSchema),z.lazy(() => DatingPreferencesWhereInputSchema).array() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional()
}).strict();

export const DatingPreferencesOrderByWithRelationInputSchema: z.ZodType<Prisma.DatingPreferencesOrderByWithRelationInput> = z.object({
  profileId: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefAgeMax: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefGender: z.lazy(() => SortOrderSchema).optional(),
  prefKids: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DatingPreferencesWhereUniqueInputSchema: z.ZodType<Prisma.DatingPreferencesWhereUniqueInput> = z.object({
  profileId: z.string()
})
.and(z.object({
  profileId: z.string().optional(),
  AND: z.union([ z.lazy(() => DatingPreferencesWhereInputSchema),z.lazy(() => DatingPreferencesWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => DatingPreferencesWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DatingPreferencesWhereInputSchema),z.lazy(() => DatingPreferencesWhereInputSchema).array() ]).optional(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional()
}).strict());

export const DatingPreferencesOrderByWithAggregationInputSchema: z.ZodType<Prisma.DatingPreferencesOrderByWithAggregationInput> = z.object({
  profileId: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefAgeMax: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  prefGender: z.lazy(() => SortOrderSchema).optional(),
  prefKids: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => DatingPreferencesCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => DatingPreferencesAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => DatingPreferencesMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => DatingPreferencesMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => DatingPreferencesSumOrderByAggregateInputSchema).optional()
}).strict();

export const DatingPreferencesScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DatingPreferencesScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => DatingPreferencesScalarWhereWithAggregatesInputSchema),z.lazy(() => DatingPreferencesScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => DatingPreferencesScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => DatingPreferencesScalarWhereWithAggregatesInputSchema),z.lazy(() => DatingPreferencesScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  profileId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional()
}).strict();

export const LocalizedProfileFieldWhereInputSchema: z.ZodType<Prisma.LocalizedProfileFieldWhereInput> = z.object({
  AND: z.union([ z.lazy(() => LocalizedProfileFieldWhereInputSchema),z.lazy(() => LocalizedProfileFieldWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => LocalizedProfileFieldWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => LocalizedProfileFieldWhereInputSchema),z.lazy(() => LocalizedProfileFieldWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  field: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  value: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profile: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
}).strict();

export const LocalizedProfileFieldOrderByWithRelationInputSchema: z.ZodType<Prisma.LocalizedProfileFieldOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  field: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  value: z.lazy(() => SortOrderSchema).optional(),
  profile: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional()
}).strict();

export const LocalizedProfileFieldWhereUniqueInputSchema: z.ZodType<Prisma.LocalizedProfileFieldWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    profileId_field_locale: z.lazy(() => LocalizedProfileFieldProfileIdFieldLocaleCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    profileId_field_locale: z.lazy(() => LocalizedProfileFieldProfileIdFieldLocaleCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  profileId_field_locale: z.lazy(() => LocalizedProfileFieldProfileIdFieldLocaleCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => LocalizedProfileFieldWhereInputSchema),z.lazy(() => LocalizedProfileFieldWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => LocalizedProfileFieldWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => LocalizedProfileFieldWhereInputSchema),z.lazy(() => LocalizedProfileFieldWhereInputSchema).array() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  field: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  value: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profile: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
}).strict());

export const LocalizedProfileFieldOrderByWithAggregationInputSchema: z.ZodType<Prisma.LocalizedProfileFieldOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  field: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  value: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => LocalizedProfileFieldCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => LocalizedProfileFieldMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => LocalizedProfileFieldMinOrderByAggregateInputSchema).optional()
}).strict();

export const LocalizedProfileFieldScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.LocalizedProfileFieldScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => LocalizedProfileFieldScalarWhereWithAggregatesInputSchema),z.lazy(() => LocalizedProfileFieldScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => LocalizedProfileFieldScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => LocalizedProfileFieldScalarWhereWithAggregatesInputSchema),z.lazy(() => LocalizedProfileFieldScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  field: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  value: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const ProfileImageWhereInputSchema: z.ZodType<Prisma.ProfileImageWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileImageWhereInputSchema),z.lazy(() => ProfileImageWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileImageWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileImageWhereInputSchema),z.lazy(() => ProfileImageWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  position: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  altText: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  storagePath: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  width: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  height: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  contentHash: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  isModerated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isFlagged: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  profile: z.union([ z.lazy(() => ProfileNullableScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional().nullable(),
}).strict();

export const ProfileImageOrderByWithRelationInputSchema: z.ZodType<Prisma.ProfileImageOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  position: z.lazy(() => SortOrderSchema).optional(),
  altText: z.lazy(() => SortOrderSchema).optional(),
  storagePath: z.lazy(() => SortOrderSchema).optional(),
  url: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  width: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  height: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  contentHash: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isModerated: z.lazy(() => SortOrderSchema).optional(),
  isFlagged: z.lazy(() => SortOrderSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  profile: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional()
}).strict();

export const ProfileImageWhereUniqueInputSchema: z.ZodType<Prisma.ProfileImageWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    storagePath: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    storagePath: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  storagePath: z.string().optional(),
  AND: z.union([ z.lazy(() => ProfileImageWhereInputSchema),z.lazy(() => ProfileImageWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileImageWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileImageWhereInputSchema),z.lazy(() => ProfileImageWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  position: z.union([ z.lazy(() => IntFilterSchema),z.number().int() ]).optional(),
  altText: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  width: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  height: z.union([ z.lazy(() => IntNullableFilterSchema),z.number().int() ]).optional().nullable(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  contentHash: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  isModerated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isFlagged: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  profile: z.union([ z.lazy(() => ProfileNullableScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional().nullable(),
}).strict());

export const ProfileImageOrderByWithAggregationInputSchema: z.ZodType<Prisma.ProfileImageOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  position: z.lazy(() => SortOrderSchema).optional(),
  altText: z.lazy(() => SortOrderSchema).optional(),
  storagePath: z.lazy(() => SortOrderSchema).optional(),
  url: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  width: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  height: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  contentHash: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isModerated: z.lazy(() => SortOrderSchema).optional(),
  isFlagged: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ProfileImageCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => ProfileImageAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ProfileImageMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ProfileImageMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => ProfileImageSumOrderByAggregateInputSchema).optional()
}).strict();

export const ProfileImageScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ProfileImageScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileImageScalarWhereWithAggregatesInputSchema),z.lazy(() => ProfileImageScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileImageScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileImageScalarWhereWithAggregatesInputSchema),z.lazy(() => ProfileImageScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  position: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  altText: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  storagePath: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  width: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  height: z.union([ z.lazy(() => IntNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  mimeType: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  contentHash: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  isModerated: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isFlagged: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
}).strict();

export const ConversationWhereInputSchema: z.ZodType<Prisma.ConversationWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ConversationWhereInputSchema),z.lazy(() => ConversationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationWhereInputSchema),z.lazy(() => ConversationWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  profileAId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileBId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumConversationStatusFilterSchema),z.lazy(() => ConversationStatusSchema) ]).optional(),
  initiatorProfileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileA: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  profileB: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantListRelationFilterSchema).optional(),
  messages: z.lazy(() => MessageListRelationFilterSchema).optional(),
  initiator: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
}).strict();

export const ConversationOrderByWithRelationInputSchema: z.ZodType<Prisma.ConversationOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  profileAId: z.lazy(() => SortOrderSchema).optional(),
  profileBId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  initiatorProfileId: z.lazy(() => SortOrderSchema).optional(),
  profileA: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional(),
  profileB: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional(),
  participants: z.lazy(() => ConversationParticipantOrderByRelationAggregateInputSchema).optional(),
  messages: z.lazy(() => MessageOrderByRelationAggregateInputSchema).optional(),
  initiator: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional()
}).strict();

export const ConversationWhereUniqueInputSchema: z.ZodType<Prisma.ConversationWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    profileAId_profileBId: z.lazy(() => ConversationProfileAId_profileBIdCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    profileAId_profileBId: z.lazy(() => ConversationProfileAId_profileBIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  profileAId_profileBId: z.lazy(() => ConversationProfileAId_profileBIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => ConversationWhereInputSchema),z.lazy(() => ConversationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationWhereInputSchema),z.lazy(() => ConversationWhereInputSchema).array() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  profileAId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileBId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumConversationStatusFilterSchema),z.lazy(() => ConversationStatusSchema) ]).optional(),
  initiatorProfileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileA: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  profileB: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantListRelationFilterSchema).optional(),
  messages: z.lazy(() => MessageListRelationFilterSchema).optional(),
  initiator: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
}).strict());

export const ConversationOrderByWithAggregationInputSchema: z.ZodType<Prisma.ConversationOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  profileAId: z.lazy(() => SortOrderSchema).optional(),
  profileBId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  initiatorProfileId: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ConversationCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ConversationMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ConversationMinOrderByAggregateInputSchema).optional()
}).strict();

export const ConversationScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ConversationScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ConversationScalarWhereWithAggregatesInputSchema),z.lazy(() => ConversationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationScalarWhereWithAggregatesInputSchema),z.lazy(() => ConversationScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  profileAId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  profileBId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumConversationStatusWithAggregatesFilterSchema),z.lazy(() => ConversationStatusSchema) ]).optional(),
  initiatorProfileId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const ConversationParticipantWhereInputSchema: z.ZodType<Prisma.ConversationParticipantWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ConversationParticipantWhereInputSchema),z.lazy(() => ConversationParticipantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationParticipantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationParticipantWhereInputSchema),z.lazy(() => ConversationParticipantWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lastReadAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  isMuted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isArchived: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  profile: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  conversation: z.union([ z.lazy(() => ConversationScalarRelationFilterSchema),z.lazy(() => ConversationWhereInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantOrderByWithRelationInputSchema: z.ZodType<Prisma.ConversationParticipantOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  lastReadAt: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isMuted: z.lazy(() => SortOrderSchema).optional(),
  isArchived: z.lazy(() => SortOrderSchema).optional(),
  profile: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional(),
  conversation: z.lazy(() => ConversationOrderByWithRelationInputSchema).optional()
}).strict();

export const ConversationParticipantWhereUniqueInputSchema: z.ZodType<Prisma.ConversationParticipantWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    profileId_conversationId: z.lazy(() => ConversationParticipantProfileIdConversationIdCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    profileId_conversationId: z.lazy(() => ConversationParticipantProfileIdConversationIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  profileId_conversationId: z.lazy(() => ConversationParticipantProfileIdConversationIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => ConversationParticipantWhereInputSchema),z.lazy(() => ConversationParticipantWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationParticipantWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationParticipantWhereInputSchema),z.lazy(() => ConversationParticipantWhereInputSchema).array() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lastReadAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  isMuted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isArchived: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  profile: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  conversation: z.union([ z.lazy(() => ConversationScalarRelationFilterSchema),z.lazy(() => ConversationWhereInputSchema) ]).optional(),
}).strict());

export const ConversationParticipantOrderByWithAggregationInputSchema: z.ZodType<Prisma.ConversationParticipantOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  lastReadAt: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isMuted: z.lazy(() => SortOrderSchema).optional(),
  isArchived: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ConversationParticipantCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ConversationParticipantMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ConversationParticipantMinOrderByAggregateInputSchema).optional()
}).strict();

export const ConversationParticipantScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ConversationParticipantScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ConversationParticipantScalarWhereWithAggregatesInputSchema),z.lazy(() => ConversationParticipantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationParticipantScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationParticipantScalarWhereWithAggregatesInputSchema),z.lazy(() => ConversationParticipantScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  lastReadAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  isMuted: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  isArchived: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
}).strict();

export const MessageWhereInputSchema: z.ZodType<Prisma.MessageWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MessageWhereInputSchema),z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageWhereInputSchema),z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  senderId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  content: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  conversation: z.union([ z.lazy(() => ConversationScalarRelationFilterSchema),z.lazy(() => ConversationWhereInputSchema) ]).optional(),
  sender: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
}).strict();

export const MessageOrderByWithRelationInputSchema: z.ZodType<Prisma.MessageOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  senderId: z.lazy(() => SortOrderSchema).optional(),
  content: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  conversation: z.lazy(() => ConversationOrderByWithRelationInputSchema).optional(),
  sender: z.lazy(() => ProfileOrderByWithRelationInputSchema).optional()
}).strict();

export const MessageWhereUniqueInputSchema: z.ZodType<Prisma.MessageWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => MessageWhereInputSchema),z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageWhereInputSchema),z.lazy(() => MessageWhereInputSchema).array() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  senderId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  content: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  conversation: z.union([ z.lazy(() => ConversationScalarRelationFilterSchema),z.lazy(() => ConversationWhereInputSchema) ]).optional(),
  sender: z.union([ z.lazy(() => ProfileScalarRelationFilterSchema),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
}).strict());

export const MessageOrderByWithAggregationInputSchema: z.ZodType<Prisma.MessageOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  senderId: z.lazy(() => SortOrderSchema).optional(),
  content: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => MessageCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => MessageMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => MessageMinOrderByAggregateInputSchema).optional()
}).strict();

export const MessageScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.MessageScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => MessageScalarWhereWithAggregatesInputSchema),z.lazy(() => MessageScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageScalarWhereWithAggregatesInputSchema),z.lazy(() => MessageScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  senderId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  content: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const PushSubscriptionWhereInputSchema: z.ZodType<Prisma.PushSubscriptionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => PushSubscriptionWhereInputSchema),z.lazy(() => PushSubscriptionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PushSubscriptionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PushSubscriptionWhereInputSchema),z.lazy(() => PushSubscriptionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  endpoint: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  p256dh: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  auth: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  deviceInfo: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  lastSeen: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict();

export const PushSubscriptionOrderByWithRelationInputSchema: z.ZodType<Prisma.PushSubscriptionOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  endpoint: z.lazy(() => SortOrderSchema).optional(),
  p256dh: z.lazy(() => SortOrderSchema).optional(),
  auth: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  deviceInfo: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastSeen: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional()
}).strict();

export const PushSubscriptionWhereUniqueInputSchema: z.ZodType<Prisma.PushSubscriptionWhereUniqueInput> = z.union([
  z.object({
    id: z.string().cuid(),
    endpoint: z.string()
  }),
  z.object({
    id: z.string().cuid(),
  }),
  z.object({
    endpoint: z.string(),
  }),
])
.and(z.object({
  id: z.string().cuid().optional(),
  endpoint: z.string().optional(),
  AND: z.union([ z.lazy(() => PushSubscriptionWhereInputSchema),z.lazy(() => PushSubscriptionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PushSubscriptionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PushSubscriptionWhereInputSchema),z.lazy(() => PushSubscriptionWhereInputSchema).array() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  p256dh: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  auth: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  deviceInfo: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  lastSeen: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export const PushSubscriptionOrderByWithAggregationInputSchema: z.ZodType<Prisma.PushSubscriptionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  endpoint: z.lazy(() => SortOrderSchema).optional(),
  p256dh: z.lazy(() => SortOrderSchema).optional(),
  auth: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  deviceInfo: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  lastSeen: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  _count: z.lazy(() => PushSubscriptionCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => PushSubscriptionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => PushSubscriptionMinOrderByAggregateInputSchema).optional()
}).strict();

export const PushSubscriptionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.PushSubscriptionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => PushSubscriptionScalarWhereWithAggregatesInputSchema),z.lazy(() => PushSubscriptionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => PushSubscriptionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PushSubscriptionScalarWhereWithAggregatesInputSchema),z.lazy(() => PushSubscriptionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  endpoint: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  p256dh: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  auth: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  deviceInfo: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  lastSeen: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
}).strict();

export const CityCreateInputSchema: z.ZodType<Prisma.CityCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  country: z.string(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profiles: z.lazy(() => ProfileCreateNestedManyWithoutCityInputSchema).optional()
}).strict();

export const CityUncheckedCreateInputSchema: z.ZodType<Prisma.CityUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  country: z.string(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutCityInputSchema).optional()
}).strict();

export const CityUpdateInputSchema: z.ZodType<Prisma.CityUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lat: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lon: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profiles: z.lazy(() => ProfileUpdateManyWithoutCityNestedInputSchema).optional()
}).strict();

export const CityUncheckedUpdateInputSchema: z.ZodType<Prisma.CityUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lat: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lon: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutCityNestedInputSchema).optional()
}).strict();

export const CityCreateManyInputSchema: z.ZodType<Prisma.CityCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  country: z.string(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const CityUpdateManyMutationInputSchema: z.ZodType<Prisma.CityUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lat: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lon: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CityUncheckedUpdateManyInputSchema: z.ZodType<Prisma.CityUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lat: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lon: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagCreateInputSchema: z.ZodType<Prisma.TagCreateInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  translations: z.lazy(() => TagTranslationCreateNestedManyWithoutTagInputSchema).optional(),
  profileTags: z.lazy(() => ProfileTagCreateNestedManyWithoutTagInputSchema).optional()
}).strict();

export const TagUncheckedCreateInputSchema: z.ZodType<Prisma.TagUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  translations: z.lazy(() => TagTranslationUncheckedCreateNestedManyWithoutTagInputSchema).optional(),
  profileTags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutTagInputSchema).optional()
}).strict();

export const TagUpdateInputSchema: z.ZodType<Prisma.TagUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  translations: z.lazy(() => TagTranslationUpdateManyWithoutTagNestedInputSchema).optional(),
  profileTags: z.lazy(() => ProfileTagUpdateManyWithoutTagNestedInputSchema).optional()
}).strict();

export const TagUncheckedUpdateInputSchema: z.ZodType<Prisma.TagUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  translations: z.lazy(() => TagTranslationUncheckedUpdateManyWithoutTagNestedInputSchema).optional(),
  profileTags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutTagNestedInputSchema).optional()
}).strict();

export const TagCreateManyInputSchema: z.ZodType<Prisma.TagCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const TagUpdateManyMutationInputSchema: z.ZodType<Prisma.TagUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TagUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagTranslationCreateInputSchema: z.ZodType<Prisma.TagTranslationCreateInput> = z.object({
  locale: z.string(),
  name: z.string(),
  tag: z.lazy(() => TagCreateNestedOneWithoutTranslationsInputSchema)
}).strict();

export const TagTranslationUncheckedCreateInputSchema: z.ZodType<Prisma.TagTranslationUncheckedCreateInput> = z.object({
  id: z.number().int().optional(),
  tagId: z.string(),
  locale: z.string(),
  name: z.string()
}).strict();

export const TagTranslationUpdateInputSchema: z.ZodType<Prisma.TagTranslationUpdateInput> = z.object({
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tag: z.lazy(() => TagUpdateOneRequiredWithoutTranslationsNestedInputSchema).optional()
}).strict();

export const TagTranslationUncheckedUpdateInputSchema: z.ZodType<Prisma.TagTranslationUncheckedUpdateInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  tagId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagTranslationCreateManyInputSchema: z.ZodType<Prisma.TagTranslationCreateManyInput> = z.object({
  id: z.number().int().optional(),
  tagId: z.string(),
  locale: z.string(),
  name: z.string()
}).strict();

export const TagTranslationUpdateManyMutationInputSchema: z.ZodType<Prisma.TagTranslationUpdateManyMutationInput> = z.object({
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagTranslationUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TagTranslationUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  tagId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileTagCreateInputSchema: z.ZodType<Prisma.ProfileTagCreateInput> = z.object({
  id: z.string().cuid().optional(),
  tag: z.lazy(() => TagCreateNestedOneWithoutProfileTagsInputSchema),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutTagsInputSchema).optional()
}).strict();

export const ProfileTagUncheckedCreateInputSchema: z.ZodType<Prisma.ProfileTagUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  tagId: z.string(),
  profileId: z.string().optional().nullable()
}).strict();

export const ProfileTagUpdateInputSchema: z.ZodType<Prisma.ProfileTagUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tag: z.lazy(() => TagUpdateOneRequiredWithoutProfileTagsNestedInputSchema).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutTagsNestedInputSchema).optional()
}).strict();

export const ProfileTagUncheckedUpdateInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tagId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ProfileTagCreateManyInputSchema: z.ZodType<Prisma.ProfileTagCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  tagId: z.string(),
  profileId: z.string().optional().nullable()
}).strict();

export const ProfileTagUpdateManyMutationInputSchema: z.ZodType<Prisma.ProfileTagUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileTagUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tagId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ConnectionRequestCreateInputSchema: z.ZodType<Prisma.ConnectionRequestCreateInput> = z.object({
  id: z.string().cuid().optional(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional(),
  fromUser: z.lazy(() => UserCreateNestedOneWithoutRequestsSentInputSchema),
  toUser: z.lazy(() => UserCreateNestedOneWithoutRequestsReceivedInputSchema)
}).strict();

export const ConnectionRequestUncheckedCreateInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  fromUserId: z.string(),
  toUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConnectionRequestUpdateInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  fromUser: z.lazy(() => UserUpdateOneRequiredWithoutRequestsSentNestedInputSchema).optional(),
  toUser: z.lazy(() => UserUpdateOneRequiredWithoutRequestsReceivedNestedInputSchema).optional()
}).strict();

export const ConnectionRequestUncheckedUpdateInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  fromUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  toUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestCreateManyInputSchema: z.ZodType<Prisma.ConnectionRequestCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  fromUserId: z.string(),
  toUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConnectionRequestUpdateManyMutationInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  fromUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  toUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
}).strict();

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
}).strict();

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
}).strict();

export const ProfileCreateInputSchema: z.ZodType<Prisma.ProfileCreateInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUpdateInputSchema: z.ZodType<Prisma.ProfileUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileCreateManyInputSchema: z.ZodType<Prisma.ProfileCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const ProfileUpdateManyMutationInputSchema: z.ZodType<Prisma.ProfileUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const DatingPreferencesCreateInputSchema: z.ZodType<Prisma.DatingPreferencesCreateInput> = z.object({
  profileId: z.string(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesUncheckedCreateInputSchema: z.ZodType<Prisma.DatingPreferencesUncheckedCreateInput> = z.object({
  profileId: z.string(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesUpdateInputSchema: z.ZodType<Prisma.DatingPreferencesUpdateInput> = z.object({
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesUncheckedUpdateInputSchema: z.ZodType<Prisma.DatingPreferencesUncheckedUpdateInput> = z.object({
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesCreateManyInputSchema: z.ZodType<Prisma.DatingPreferencesCreateManyInput> = z.object({
  profileId: z.string(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesUpdateManyMutationInputSchema: z.ZodType<Prisma.DatingPreferencesUpdateManyMutationInput> = z.object({
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DatingPreferencesUncheckedUpdateManyInput> = z.object({
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => DatingPreferencesUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => DatingPreferencesUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const LocalizedProfileFieldCreateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateInput> = z.object({
  id: z.string().cuid().optional(),
  field: z.string(),
  locale: z.string(),
  value: z.string(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutLocalizedInputSchema)
}).strict();

export const LocalizedProfileFieldUncheckedCreateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string(),
  field: z.string(),
  locale: z.string(),
  value: z.string()
}).strict();

export const LocalizedProfileFieldUpdateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneRequiredWithoutLocalizedNestedInputSchema).optional()
}).strict();

export const LocalizedProfileFieldUncheckedUpdateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const LocalizedProfileFieldCreateManyInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string(),
  field: z.string(),
  locale: z.string(),
  value: z.string()
}).strict();

export const LocalizedProfileFieldUpdateManyMutationInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const LocalizedProfileFieldUncheckedUpdateManyInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileImageCreateInputSchema: z.ZodType<Prisma.ProfileImageCreateInput> = z.object({
  id: z.string().cuid().optional(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileImageInputSchema),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutProfileImagesInputSchema).optional()
}).strict();

export const ProfileImageUncheckedCreateInputSchema: z.ZodType<Prisma.ProfileImageUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  profileId: z.string().optional().nullable(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional()
}).strict();

export const ProfileImageUpdateInputSchema: z.ZodType<Prisma.ProfileImageUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileImageNestedInputSchema).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutProfileImagesNestedInputSchema).optional()
}).strict();

export const ProfileImageUncheckedUpdateInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileImageCreateManyInputSchema: z.ZodType<Prisma.ProfileImageCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  profileId: z.string().optional().nullable(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional()
}).strict();

export const ProfileImageUpdateManyMutationInputSchema: z.ZodType<Prisma.ProfileImageUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileImageUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationCreateInputSchema: z.ZodType<Prisma.ConversationCreateInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  profileA: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsAInputSchema),
  profileB: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsBInputSchema),
  participants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutConversationInputSchema).optional(),
  initiator: z.lazy(() => ProfileCreateNestedOneWithoutConversationInputSchema)
}).strict();

export const ConversationUncheckedCreateInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string(),
  participants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationUpdateInputSchema: z.ZodType<Prisma.ConversationUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  profileA: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsANestedInputSchema).optional(),
  profileB: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsBNestedInputSchema).optional(),
  participants: z.lazy(() => ConversationParticipantUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutConversationNestedInputSchema).optional(),
  initiator: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationCreateManyInputSchema: z.ZodType<Prisma.ConversationCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string()
}).strict();

export const ConversationUpdateManyMutationInputSchema: z.ZodType<Prisma.ConversationUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantCreateInputSchema: z.ZodType<Prisma.ConversationParticipantCreateInput> = z.object({
  id: z.string().cuid().optional(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutConversationParticipantsInputSchema),
  conversation: z.lazy(() => ConversationCreateNestedOneWithoutParticipantsInputSchema)
}).strict();

export const ConversationParticipantUncheckedCreateInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string(),
  conversationId: z.string(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional()
}).strict();

export const ConversationParticipantUpdateInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationParticipantsNestedInputSchema).optional(),
  conversation: z.lazy(() => ConversationUpdateOneRequiredWithoutParticipantsNestedInputSchema).optional()
}).strict();

export const ConversationParticipantUncheckedUpdateInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantCreateManyInputSchema: z.ZodType<Prisma.ConversationParticipantCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string(),
  conversationId: z.string(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional()
}).strict();

export const ConversationParticipantUpdateManyMutationInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageCreateInputSchema: z.ZodType<Prisma.MessageCreateInput> = z.object({
  id: z.string().cuid().optional(),
  content: z.string(),
  createdAt: z.coerce.date().optional(),
  conversation: z.lazy(() => ConversationCreateNestedOneWithoutMessagesInputSchema),
  sender: z.lazy(() => ProfileCreateNestedOneWithoutMessageInputSchema)
}).strict();

export const MessageUncheckedCreateInputSchema: z.ZodType<Prisma.MessageUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const MessageUpdateInputSchema: z.ZodType<Prisma.MessageUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  conversation: z.lazy(() => ConversationUpdateOneRequiredWithoutMessagesNestedInputSchema).optional(),
  sender: z.lazy(() => ProfileUpdateOneRequiredWithoutMessageNestedInputSchema).optional()
}).strict();

export const MessageUncheckedUpdateInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  senderId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageCreateManyInputSchema: z.ZodType<Prisma.MessageCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const MessageUpdateManyMutationInputSchema: z.ZodType<Prisma.MessageUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageUncheckedUpdateManyInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  senderId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PushSubscriptionCreateInputSchema: z.ZodType<Prisma.PushSubscriptionCreateInput> = z.object({
  id: z.string().cuid().optional(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  deviceInfo: z.string().optional().nullable(),
  lastSeen: z.coerce.date().optional().nullable(),
  user: z.lazy(() => UserCreateNestedOneWithoutPushSubscriptionInputSchema)
}).strict();

export const PushSubscriptionUncheckedCreateInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  deviceInfo: z.string().optional().nullable(),
  lastSeen: z.coerce.date().optional().nullable()
}).strict();

export const PushSubscriptionUpdateInputSchema: z.ZodType<Prisma.PushSubscriptionUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutPushSubscriptionNestedInputSchema).optional()
}).strict();

export const PushSubscriptionUncheckedUpdateInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const PushSubscriptionCreateManyInputSchema: z.ZodType<Prisma.PushSubscriptionCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  deviceInfo: z.string().optional().nullable(),
  lastSeen: z.coerce.date().optional().nullable()
}).strict();

export const PushSubscriptionUpdateManyMutationInputSchema: z.ZodType<Prisma.PushSubscriptionUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const PushSubscriptionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const FloatNullableFilterSchema: z.ZodType<Prisma.FloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const ProfileListRelationFilterSchema: z.ZodType<Prisma.ProfileListRelationFilter> = z.object({
  every: z.lazy(() => ProfileWhereInputSchema).optional(),
  some: z.lazy(() => ProfileWhereInputSchema).optional(),
  none: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.object({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional()
}).strict();

export const ProfileOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ProfileOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CityCountOrderByAggregateInputSchema: z.ZodType<Prisma.CityCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  lat: z.lazy(() => SortOrderSchema).optional(),
  lon: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CityAvgOrderByAggregateInputSchema: z.ZodType<Prisma.CityAvgOrderByAggregateInput> = z.object({
  lat: z.lazy(() => SortOrderSchema).optional(),
  lon: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CityMaxOrderByAggregateInputSchema: z.ZodType<Prisma.CityMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  lat: z.lazy(() => SortOrderSchema).optional(),
  lon: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CityMinOrderByAggregateInputSchema: z.ZodType<Prisma.CityMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  lat: z.lazy(() => SortOrderSchema).optional(),
  lon: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const CitySumOrderByAggregateInputSchema: z.ZodType<Prisma.CitySumOrderByAggregateInput> = z.object({
  lat: z.lazy(() => SortOrderSchema).optional(),
  lon: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const FloatNullableWithAggregatesFilterSchema: z.ZodType<Prisma.FloatNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatNullableFilterSchema).optional()
}).strict();

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional()
}).strict();

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const TagTranslationListRelationFilterSchema: z.ZodType<Prisma.TagTranslationListRelationFilter> = z.object({
  every: z.lazy(() => TagTranslationWhereInputSchema).optional(),
  some: z.lazy(() => TagTranslationWhereInputSchema).optional(),
  none: z.lazy(() => TagTranslationWhereInputSchema).optional()
}).strict();

export const ProfileTagListRelationFilterSchema: z.ZodType<Prisma.ProfileTagListRelationFilter> = z.object({
  every: z.lazy(() => ProfileTagWhereInputSchema).optional(),
  some: z.lazy(() => ProfileTagWhereInputSchema).optional(),
  none: z.lazy(() => ProfileTagWhereInputSchema).optional()
}).strict();

export const TagTranslationOrderByRelationAggregateInputSchema: z.ZodType<Prisma.TagTranslationOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileTagOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ProfileTagOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagCountOrderByAggregateInputSchema: z.ZodType<Prisma.TagCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  slug: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TagMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  slug: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagMinOrderByAggregateInputSchema: z.ZodType<Prisma.TagMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  slug: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  isUserCreated: z.lazy(() => SortOrderSchema).optional(),
  isApproved: z.lazy(() => SortOrderSchema).optional(),
  isHidden: z.lazy(() => SortOrderSchema).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const IntFilterSchema: z.ZodType<Prisma.IntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const TagScalarRelationFilterSchema: z.ZodType<Prisma.TagScalarRelationFilter> = z.object({
  is: z.lazy(() => TagWhereInputSchema).optional(),
  isNot: z.lazy(() => TagWhereInputSchema).optional()
}).strict();

export const TagTranslationTagIdLocaleCompoundUniqueInputSchema: z.ZodType<Prisma.TagTranslationTagIdLocaleCompoundUniqueInput> = z.object({
  tagId: z.string(),
  locale: z.string()
}).strict();

export const TagTranslationCountOrderByAggregateInputSchema: z.ZodType<Prisma.TagTranslationCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagTranslationAvgOrderByAggregateInputSchema: z.ZodType<Prisma.TagTranslationAvgOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagTranslationMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TagTranslationMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagTranslationMinOrderByAggregateInputSchema: z.ZodType<Prisma.TagTranslationMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TagTranslationSumOrderByAggregateInputSchema: z.ZodType<Prisma.TagTranslationSumOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const IntWithAggregatesFilterSchema: z.ZodType<Prisma.IntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional()
}).strict();

export const ProfileNullableScalarRelationFilterSchema: z.ZodType<Prisma.ProfileNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => ProfileWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => ProfileWhereInputSchema).optional().nullable()
}).strict();

export const ProfileTagProfileIdTagIdCompoundUniqueInputSchema: z.ZodType<Prisma.ProfileTagProfileIdTagIdCompoundUniqueInput> = z.object({
  profileId: z.string(),
  tagId: z.string()
}).strict();

export const ProfileTagCountOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileTagCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileTagMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileTagMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileTagMinOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileTagMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  tagId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumConnectionTypeFilterSchema: z.ZodType<Prisma.EnumConnectionTypeFilter> = z.object({
  equals: z.lazy(() => ConnectionTypeSchema).optional(),
  in: z.lazy(() => ConnectionTypeSchema).array().optional(),
  notIn: z.lazy(() => ConnectionTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => NestedEnumConnectionTypeFilterSchema) ]).optional(),
}).strict();

export const EnumConnectionStatusFilterSchema: z.ZodType<Prisma.EnumConnectionStatusFilter> = z.object({
  equals: z.lazy(() => ConnectionStatusSchema).optional(),
  in: z.lazy(() => ConnectionStatusSchema).array().optional(),
  notIn: z.lazy(() => ConnectionStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => NestedEnumConnectionStatusFilterSchema) ]).optional(),
}).strict();

export const UserScalarRelationFilterSchema: z.ZodType<Prisma.UserScalarRelationFilter> = z.object({
  is: z.lazy(() => UserWhereInputSchema).optional(),
  isNot: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const ConnectionRequestFromUserIdToUserIdScopeCompoundUniqueInputSchema: z.ZodType<Prisma.ConnectionRequestFromUserIdToUserIdScopeCompoundUniqueInput> = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema)
}).strict();

export const ConnectionRequestCountOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionRequestCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  fromUserId: z.lazy(() => SortOrderSchema).optional(),
  toUserId: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConnectionRequestMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionRequestMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  fromUserId: z.lazy(() => SortOrderSchema).optional(),
  toUserId: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConnectionRequestMinOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionRequestMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  fromUserId: z.lazy(() => SortOrderSchema).optional(),
  toUserId: z.lazy(() => SortOrderSchema).optional(),
  scope: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumConnectionTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumConnectionTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ConnectionTypeSchema).optional(),
  in: z.lazy(() => ConnectionTypeSchema).array().optional(),
  notIn: z.lazy(() => ConnectionTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => NestedEnumConnectionTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumConnectionTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumConnectionTypeFilterSchema).optional()
}).strict();

export const EnumConnectionStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumConnectionStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ConnectionStatusSchema).optional(),
  in: z.lazy(() => ConnectionStatusSchema).array().optional(),
  notIn: z.lazy(() => ConnectionStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => NestedEnumConnectionStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumConnectionStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumConnectionStatusFilterSchema).optional()
}).strict();

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumUserRoleNullableListFilterSchema: z.ZodType<Prisma.EnumUserRoleNullableListFilter> = z.object({
  equals: z.lazy(() => UserRoleSchema).array().optional().nullable(),
  has: z.lazy(() => UserRoleSchema).optional().nullable(),
  hasEvery: z.lazy(() => UserRoleSchema).array().optional(),
  hasSome: z.lazy(() => UserRoleSchema).array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export const ProfileImageListRelationFilterSchema: z.ZodType<Prisma.ProfileImageListRelationFilter> = z.object({
  every: z.lazy(() => ProfileImageWhereInputSchema).optional(),
  some: z.lazy(() => ProfileImageWhereInputSchema).optional(),
  none: z.lazy(() => ProfileImageWhereInputSchema).optional()
}).strict();

export const ConnectionRequestListRelationFilterSchema: z.ZodType<Prisma.ConnectionRequestListRelationFilter> = z.object({
  every: z.lazy(() => ConnectionRequestWhereInputSchema).optional(),
  some: z.lazy(() => ConnectionRequestWhereInputSchema).optional(),
  none: z.lazy(() => ConnectionRequestWhereInputSchema).optional()
}).strict();

export const PushSubscriptionListRelationFilterSchema: z.ZodType<Prisma.PushSubscriptionListRelationFilter> = z.object({
  every: z.lazy(() => PushSubscriptionWhereInputSchema).optional(),
  some: z.lazy(() => PushSubscriptionWhereInputSchema).optional(),
  none: z.lazy(() => PushSubscriptionWhereInputSchema).optional()
}).strict();

export const ProfileImageOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ProfileImageOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConnectionRequestOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ConnectionRequestOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PushSubscriptionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.PushSubscriptionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phonenumber: z.lazy(() => SortOrderSchema).optional(),
  tokenVersion: z.lazy(() => SortOrderSchema).optional(),
  loginToken: z.lazy(() => SortOrderSchema).optional(),
  loginTokenExp: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isRegistrationConfirmed: z.lazy(() => SortOrderSchema).optional(),
  hasActiveProfile: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.lazy(() => SortOrderSchema).optional(),
  language: z.lazy(() => SortOrderSchema).optional(),
  roles: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserAvgOrderByAggregateInputSchema: z.ZodType<Prisma.UserAvgOrderByAggregateInput> = z.object({
  tokenVersion: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phonenumber: z.lazy(() => SortOrderSchema).optional(),
  tokenVersion: z.lazy(() => SortOrderSchema).optional(),
  loginToken: z.lazy(() => SortOrderSchema).optional(),
  loginTokenExp: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isRegistrationConfirmed: z.lazy(() => SortOrderSchema).optional(),
  hasActiveProfile: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.lazy(() => SortOrderSchema).optional(),
  language: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  phonenumber: z.lazy(() => SortOrderSchema).optional(),
  tokenVersion: z.lazy(() => SortOrderSchema).optional(),
  loginToken: z.lazy(() => SortOrderSchema).optional(),
  loginTokenExp: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isRegistrationConfirmed: z.lazy(() => SortOrderSchema).optional(),
  hasActiveProfile: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  lastLoginAt: z.lazy(() => SortOrderSchema).optional(),
  language: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const UserSumOrderByAggregateInputSchema: z.ZodType<Prisma.UserSumOrderByAggregateInput> = z.object({
  tokenVersion: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const StringNullableListFilterSchema: z.ZodType<Prisma.StringNullableListFilter> = z.object({
  equals: z.string().array().optional().nullable(),
  has: z.string().optional().nullable(),
  hasEvery: z.string().array().optional(),
  hasSome: z.string().array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export const EnumGenderNullableFilterSchema: z.ZodType<Prisma.EnumGenderNullableFilter> = z.object({
  equals: z.lazy(() => GenderSchema).optional().nullable(),
  in: z.lazy(() => GenderSchema).array().optional().nullable(),
  notIn: z.lazy(() => GenderSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NestedEnumGenderNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumPronounsNullableFilterSchema: z.ZodType<Prisma.EnumPronounsNullableFilter> = z.object({
  equals: z.lazy(() => PronounsSchema).optional().nullable(),
  in: z.lazy(() => PronounsSchema).array().optional().nullable(),
  notIn: z.lazy(() => PronounsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NestedEnumPronounsNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumRelationshipStatusNullableFilterSchema: z.ZodType<Prisma.EnumRelationshipStatusNullableFilter> = z.object({
  equals: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  in: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NestedEnumRelationshipStatusNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumHasKidsNullableFilterSchema: z.ZodType<Prisma.EnumHasKidsNullableFilter> = z.object({
  equals: z.lazy(() => HasKidsSchema).optional().nullable(),
  in: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  notIn: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NestedEnumHasKidsNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const IntNullableFilterSchema: z.ZodType<Prisma.IntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumGenderNullableListFilterSchema: z.ZodType<Prisma.EnumGenderNullableListFilter> = z.object({
  equals: z.lazy(() => GenderSchema).array().optional().nullable(),
  has: z.lazy(() => GenderSchema).optional().nullable(),
  hasEvery: z.lazy(() => GenderSchema).array().optional(),
  hasSome: z.lazy(() => GenderSchema).array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export const EnumHasKidsNullableListFilterSchema: z.ZodType<Prisma.EnumHasKidsNullableListFilter> = z.object({
  equals: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  has: z.lazy(() => HasKidsSchema).optional().nullable(),
  hasEvery: z.lazy(() => HasKidsSchema).array().optional(),
  hasSome: z.lazy(() => HasKidsSchema).array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export const CityNullableScalarRelationFilterSchema: z.ZodType<Prisma.CityNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => CityWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => CityWhereInputSchema).optional().nullable()
}).strict();

export const ConversationParticipantListRelationFilterSchema: z.ZodType<Prisma.ConversationParticipantListRelationFilter> = z.object({
  every: z.lazy(() => ConversationParticipantWhereInputSchema).optional(),
  some: z.lazy(() => ConversationParticipantWhereInputSchema).optional(),
  none: z.lazy(() => ConversationParticipantWhereInputSchema).optional()
}).strict();

export const ConversationListRelationFilterSchema: z.ZodType<Prisma.ConversationListRelationFilter> = z.object({
  every: z.lazy(() => ConversationWhereInputSchema).optional(),
  some: z.lazy(() => ConversationWhereInputSchema).optional(),
  none: z.lazy(() => ConversationWhereInputSchema).optional()
}).strict();

export const MessageListRelationFilterSchema: z.ZodType<Prisma.MessageListRelationFilter> = z.object({
  every: z.lazy(() => MessageWhereInputSchema).optional(),
  some: z.lazy(() => MessageWhereInputSchema).optional(),
  none: z.lazy(() => MessageWhereInputSchema).optional()
}).strict();

export const LocalizedProfileFieldListRelationFilterSchema: z.ZodType<Prisma.LocalizedProfileFieldListRelationFilter> = z.object({
  every: z.lazy(() => LocalizedProfileFieldWhereInputSchema).optional(),
  some: z.lazy(() => LocalizedProfileFieldWhereInputSchema).optional(),
  none: z.lazy(() => LocalizedProfileFieldWhereInputSchema).optional()
}).strict();

export const ConversationParticipantOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ConversationParticipantOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConversationOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ConversationOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MessageOrderByRelationAggregateInputSchema: z.ZodType<Prisma.MessageOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const LocalizedProfileFieldOrderByRelationAggregateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileCountOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  publicName: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  cityName: z.lazy(() => SortOrderSchema).optional(),
  cityId: z.lazy(() => SortOrderSchema).optional(),
  introSocial: z.lazy(() => SortOrderSchema).optional(),
  isSocialActive: z.lazy(() => SortOrderSchema).optional(),
  isDatingActive: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isReported: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  work: z.lazy(() => SortOrderSchema).optional(),
  languages: z.lazy(() => SortOrderSchema).optional(),
  introDating: z.lazy(() => SortOrderSchema).optional(),
  birthday: z.lazy(() => SortOrderSchema).optional(),
  gender: z.lazy(() => SortOrderSchema).optional(),
  pronouns: z.lazy(() => SortOrderSchema).optional(),
  relationship: z.lazy(() => SortOrderSchema).optional(),
  hasKids: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional(),
  prefGender: z.lazy(() => SortOrderSchema).optional(),
  prefKids: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileAvgOrderByAggregateInput> = z.object({
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  publicName: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  cityName: z.lazy(() => SortOrderSchema).optional(),
  cityId: z.lazy(() => SortOrderSchema).optional(),
  introSocial: z.lazy(() => SortOrderSchema).optional(),
  isSocialActive: z.lazy(() => SortOrderSchema).optional(),
  isDatingActive: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isReported: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  work: z.lazy(() => SortOrderSchema).optional(),
  introDating: z.lazy(() => SortOrderSchema).optional(),
  birthday: z.lazy(() => SortOrderSchema).optional(),
  gender: z.lazy(() => SortOrderSchema).optional(),
  pronouns: z.lazy(() => SortOrderSchema).optional(),
  relationship: z.lazy(() => SortOrderSchema).optional(),
  hasKids: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileMinOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  publicName: z.lazy(() => SortOrderSchema).optional(),
  country: z.lazy(() => SortOrderSchema).optional(),
  cityName: z.lazy(() => SortOrderSchema).optional(),
  cityId: z.lazy(() => SortOrderSchema).optional(),
  introSocial: z.lazy(() => SortOrderSchema).optional(),
  isSocialActive: z.lazy(() => SortOrderSchema).optional(),
  isDatingActive: z.lazy(() => SortOrderSchema).optional(),
  isActive: z.lazy(() => SortOrderSchema).optional(),
  isReported: z.lazy(() => SortOrderSchema).optional(),
  isBlocked: z.lazy(() => SortOrderSchema).optional(),
  isOnboarded: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  work: z.lazy(() => SortOrderSchema).optional(),
  introDating: z.lazy(() => SortOrderSchema).optional(),
  birthday: z.lazy(() => SortOrderSchema).optional(),
  gender: z.lazy(() => SortOrderSchema).optional(),
  pronouns: z.lazy(() => SortOrderSchema).optional(),
  relationship: z.lazy(() => SortOrderSchema).optional(),
  hasKids: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileSumOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileSumOrderByAggregateInput> = z.object({
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumGenderNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumGenderNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => GenderSchema).optional().nullable(),
  in: z.lazy(() => GenderSchema).array().optional().nullable(),
  notIn: z.lazy(() => GenderSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NestedEnumGenderNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumGenderNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumGenderNullableFilterSchema).optional()
}).strict();

export const EnumPronounsNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumPronounsNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PronounsSchema).optional().nullable(),
  in: z.lazy(() => PronounsSchema).array().optional().nullable(),
  notIn: z.lazy(() => PronounsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NestedEnumPronounsNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPronounsNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPronounsNullableFilterSchema).optional()
}).strict();

export const EnumRelationshipStatusNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumRelationshipStatusNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  in: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NestedEnumRelationshipStatusNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumRelationshipStatusNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumRelationshipStatusNullableFilterSchema).optional()
}).strict();

export const EnumHasKidsNullableWithAggregatesFilterSchema: z.ZodType<Prisma.EnumHasKidsNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => HasKidsSchema).optional().nullable(),
  in: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  notIn: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NestedEnumHasKidsNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumHasKidsNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumHasKidsNullableFilterSchema).optional()
}).strict();

export const IntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.IntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional()
}).strict();

export const DatingPreferencesCountOrderByAggregateInputSchema: z.ZodType<Prisma.DatingPreferencesCountOrderByAggregateInput> = z.object({
  profileId: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional(),
  prefGender: z.lazy(() => SortOrderSchema).optional(),
  prefKids: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DatingPreferencesAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DatingPreferencesAvgOrderByAggregateInput> = z.object({
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DatingPreferencesMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DatingPreferencesMaxOrderByAggregateInput> = z.object({
  profileId: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DatingPreferencesMinOrderByAggregateInputSchema: z.ZodType<Prisma.DatingPreferencesMinOrderByAggregateInput> = z.object({
  profileId: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const DatingPreferencesSumOrderByAggregateInputSchema: z.ZodType<Prisma.DatingPreferencesSumOrderByAggregateInput> = z.object({
  prefAgeMin: z.lazy(() => SortOrderSchema).optional(),
  prefAgeMax: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileScalarRelationFilterSchema: z.ZodType<Prisma.ProfileScalarRelationFilter> = z.object({
  is: z.lazy(() => ProfileWhereInputSchema).optional(),
  isNot: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const LocalizedProfileFieldProfileIdFieldLocaleCompoundUniqueInputSchema: z.ZodType<Prisma.LocalizedProfileFieldProfileIdFieldLocaleCompoundUniqueInput> = z.object({
  profileId: z.string(),
  field: z.string(),
  locale: z.string()
}).strict();

export const LocalizedProfileFieldCountOrderByAggregateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  field: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  value: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const LocalizedProfileFieldMaxOrderByAggregateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  field: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  value: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const LocalizedProfileFieldMinOrderByAggregateInputSchema: z.ZodType<Prisma.LocalizedProfileFieldMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  field: z.lazy(() => SortOrderSchema).optional(),
  locale: z.lazy(() => SortOrderSchema).optional(),
  value: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileImageCountOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileImageCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  position: z.lazy(() => SortOrderSchema).optional(),
  altText: z.lazy(() => SortOrderSchema).optional(),
  storagePath: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  width: z.lazy(() => SortOrderSchema).optional(),
  height: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  contentHash: z.lazy(() => SortOrderSchema).optional(),
  isModerated: z.lazy(() => SortOrderSchema).optional(),
  isFlagged: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileImageAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileImageAvgOrderByAggregateInput> = z.object({
  position: z.lazy(() => SortOrderSchema).optional(),
  width: z.lazy(() => SortOrderSchema).optional(),
  height: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileImageMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileImageMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  position: z.lazy(() => SortOrderSchema).optional(),
  altText: z.lazy(() => SortOrderSchema).optional(),
  storagePath: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  width: z.lazy(() => SortOrderSchema).optional(),
  height: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  contentHash: z.lazy(() => SortOrderSchema).optional(),
  isModerated: z.lazy(() => SortOrderSchema).optional(),
  isFlagged: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileImageMinOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileImageMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  position: z.lazy(() => SortOrderSchema).optional(),
  altText: z.lazy(() => SortOrderSchema).optional(),
  storagePath: z.lazy(() => SortOrderSchema).optional(),
  url: z.lazy(() => SortOrderSchema).optional(),
  width: z.lazy(() => SortOrderSchema).optional(),
  height: z.lazy(() => SortOrderSchema).optional(),
  mimeType: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  contentHash: z.lazy(() => SortOrderSchema).optional(),
  isModerated: z.lazy(() => SortOrderSchema).optional(),
  isFlagged: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileImageSumOrderByAggregateInputSchema: z.ZodType<Prisma.ProfileImageSumOrderByAggregateInput> = z.object({
  position: z.lazy(() => SortOrderSchema).optional(),
  width: z.lazy(() => SortOrderSchema).optional(),
  height: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumConversationStatusFilterSchema: z.ZodType<Prisma.EnumConversationStatusFilter> = z.object({
  equals: z.lazy(() => ConversationStatusSchema).optional(),
  in: z.lazy(() => ConversationStatusSchema).array().optional(),
  notIn: z.lazy(() => ConversationStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => NestedEnumConversationStatusFilterSchema) ]).optional(),
}).strict();

export const ConversationProfileAId_profileBIdCompoundUniqueInputSchema: z.ZodType<Prisma.ConversationProfileAId_profileBIdCompoundUniqueInput> = z.object({
  profileAId: z.string(),
  profileBId: z.string()
}).strict();

export const ConversationCountOrderByAggregateInputSchema: z.ZodType<Prisma.ConversationCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  profileAId: z.lazy(() => SortOrderSchema).optional(),
  profileBId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  initiatorProfileId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConversationMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ConversationMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  profileAId: z.lazy(() => SortOrderSchema).optional(),
  profileBId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  initiatorProfileId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConversationMinOrderByAggregateInputSchema: z.ZodType<Prisma.ConversationMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  profileAId: z.lazy(() => SortOrderSchema).optional(),
  profileBId: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  initiatorProfileId: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumConversationStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumConversationStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ConversationStatusSchema).optional(),
  in: z.lazy(() => ConversationStatusSchema).array().optional(),
  notIn: z.lazy(() => ConversationStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => NestedEnumConversationStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumConversationStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumConversationStatusFilterSchema).optional()
}).strict();

export const ConversationScalarRelationFilterSchema: z.ZodType<Prisma.ConversationScalarRelationFilter> = z.object({
  is: z.lazy(() => ConversationWhereInputSchema).optional(),
  isNot: z.lazy(() => ConversationWhereInputSchema).optional()
}).strict();

export const ConversationParticipantProfileIdConversationIdCompoundUniqueInputSchema: z.ZodType<Prisma.ConversationParticipantProfileIdConversationIdCompoundUniqueInput> = z.object({
  profileId: z.string(),
  conversationId: z.string()
}).strict();

export const ConversationParticipantCountOrderByAggregateInputSchema: z.ZodType<Prisma.ConversationParticipantCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  lastReadAt: z.lazy(() => SortOrderSchema).optional(),
  isMuted: z.lazy(() => SortOrderSchema).optional(),
  isArchived: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConversationParticipantMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ConversationParticipantMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  lastReadAt: z.lazy(() => SortOrderSchema).optional(),
  isMuted: z.lazy(() => SortOrderSchema).optional(),
  isArchived: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ConversationParticipantMinOrderByAggregateInputSchema: z.ZodType<Prisma.ConversationParticipantMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  profileId: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  lastReadAt: z.lazy(() => SortOrderSchema).optional(),
  isMuted: z.lazy(() => SortOrderSchema).optional(),
  isArchived: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MessageCountOrderByAggregateInputSchema: z.ZodType<Prisma.MessageCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  senderId: z.lazy(() => SortOrderSchema).optional(),
  content: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MessageMaxOrderByAggregateInputSchema: z.ZodType<Prisma.MessageMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  senderId: z.lazy(() => SortOrderSchema).optional(),
  content: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const MessageMinOrderByAggregateInputSchema: z.ZodType<Prisma.MessageMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  conversationId: z.lazy(() => SortOrderSchema).optional(),
  senderId: z.lazy(() => SortOrderSchema).optional(),
  content: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PushSubscriptionCountOrderByAggregateInputSchema: z.ZodType<Prisma.PushSubscriptionCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  endpoint: z.lazy(() => SortOrderSchema).optional(),
  p256dh: z.lazy(() => SortOrderSchema).optional(),
  auth: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  deviceInfo: z.lazy(() => SortOrderSchema).optional(),
  lastSeen: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PushSubscriptionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.PushSubscriptionMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  endpoint: z.lazy(() => SortOrderSchema).optional(),
  p256dh: z.lazy(() => SortOrderSchema).optional(),
  auth: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  deviceInfo: z.lazy(() => SortOrderSchema).optional(),
  lastSeen: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PushSubscriptionMinOrderByAggregateInputSchema: z.ZodType<Prisma.PushSubscriptionMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  endpoint: z.lazy(() => SortOrderSchema).optional(),
  p256dh: z.lazy(() => SortOrderSchema).optional(),
  auth: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  deviceInfo: z.lazy(() => SortOrderSchema).optional(),
  lastSeen: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ProfileCreateNestedManyWithoutCityInputSchema: z.ZodType<Prisma.ProfileCreateNestedManyWithoutCityInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutCityInputSchema),z.lazy(() => ProfileCreateWithoutCityInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileCreateManyCityInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedCreateNestedManyWithoutCityInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateNestedManyWithoutCityInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutCityInputSchema),z.lazy(() => ProfileCreateWithoutCityInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileCreateManyCityInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional()
}).strict();

export const NullableFloatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableFloatFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z.object({
  set: z.boolean().optional()
}).strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional().nullable()
}).strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional()
}).strict();

export const ProfileUpdateManyWithoutCityNestedInputSchema: z.ZodType<Prisma.ProfileUpdateManyWithoutCityNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutCityInputSchema),z.lazy(() => ProfileCreateWithoutCityInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileUpsertWithWhereUniqueWithoutCityInputSchema),z.lazy(() => ProfileUpsertWithWhereUniqueWithoutCityInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileCreateManyCityInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateWithWhereUniqueWithoutCityInputSchema),z.lazy(() => ProfileUpdateWithWhereUniqueWithoutCityInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileUpdateManyWithWhereWithoutCityInputSchema),z.lazy(() => ProfileUpdateManyWithWhereWithoutCityInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedUpdateManyWithoutCityNestedInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyWithoutCityNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutCityInputSchema),z.lazy(() => ProfileCreateWithoutCityInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutCityInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileUpsertWithWhereUniqueWithoutCityInputSchema),z.lazy(() => ProfileUpsertWithWhereUniqueWithoutCityInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileCreateManyCityInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateWithWhereUniqueWithoutCityInputSchema),z.lazy(() => ProfileUpdateWithWhereUniqueWithoutCityInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileUpdateManyWithWhereWithoutCityInputSchema),z.lazy(() => ProfileUpdateManyWithWhereWithoutCityInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TagTranslationCreateNestedManyWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationCreateNestedManyWithoutTagInput> = z.object({
  create: z.union([ z.lazy(() => TagTranslationCreateWithoutTagInputSchema),z.lazy(() => TagTranslationCreateWithoutTagInputSchema).array(),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema),z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TagTranslationCreateManyTagInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileTagCreateNestedManyWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagCreateNestedManyWithoutTagInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutTagInputSchema),z.lazy(() => ProfileTagCreateWithoutTagInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyTagInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TagTranslationUncheckedCreateNestedManyWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUncheckedCreateNestedManyWithoutTagInput> = z.object({
  create: z.union([ z.lazy(() => TagTranslationCreateWithoutTagInputSchema),z.lazy(() => TagTranslationCreateWithoutTagInputSchema).array(),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema),z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TagTranslationCreateManyTagInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileTagUncheckedCreateNestedManyWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUncheckedCreateNestedManyWithoutTagInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutTagInputSchema),z.lazy(() => ProfileTagCreateWithoutTagInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyTagInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TagTranslationUpdateManyWithoutTagNestedInputSchema: z.ZodType<Prisma.TagTranslationUpdateManyWithoutTagNestedInput> = z.object({
  create: z.union([ z.lazy(() => TagTranslationCreateWithoutTagInputSchema),z.lazy(() => TagTranslationCreateWithoutTagInputSchema).array(),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema),z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TagTranslationUpsertWithWhereUniqueWithoutTagInputSchema),z.lazy(() => TagTranslationUpsertWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TagTranslationCreateManyTagInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TagTranslationUpdateWithWhereUniqueWithoutTagInputSchema),z.lazy(() => TagTranslationUpdateWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TagTranslationUpdateManyWithWhereWithoutTagInputSchema),z.lazy(() => TagTranslationUpdateManyWithWhereWithoutTagInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TagTranslationScalarWhereInputSchema),z.lazy(() => TagTranslationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileTagUpdateManyWithoutTagNestedInputSchema: z.ZodType<Prisma.ProfileTagUpdateManyWithoutTagNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutTagInputSchema),z.lazy(() => ProfileTagCreateWithoutTagInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutTagInputSchema),z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyTagInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutTagInputSchema),z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileTagUpdateManyWithWhereWithoutTagInputSchema),z.lazy(() => ProfileTagUpdateManyWithWhereWithoutTagInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileTagScalarWhereInputSchema),z.lazy(() => ProfileTagScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TagTranslationUncheckedUpdateManyWithoutTagNestedInputSchema: z.ZodType<Prisma.TagTranslationUncheckedUpdateManyWithoutTagNestedInput> = z.object({
  create: z.union([ z.lazy(() => TagTranslationCreateWithoutTagInputSchema),z.lazy(() => TagTranslationCreateWithoutTagInputSchema).array(),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema),z.lazy(() => TagTranslationCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TagTranslationUpsertWithWhereUniqueWithoutTagInputSchema),z.lazy(() => TagTranslationUpsertWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TagTranslationCreateManyTagInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TagTranslationWhereUniqueInputSchema),z.lazy(() => TagTranslationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TagTranslationUpdateWithWhereUniqueWithoutTagInputSchema),z.lazy(() => TagTranslationUpdateWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TagTranslationUpdateManyWithWhereWithoutTagInputSchema),z.lazy(() => TagTranslationUpdateManyWithWhereWithoutTagInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TagTranslationScalarWhereInputSchema),z.lazy(() => TagTranslationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileTagUncheckedUpdateManyWithoutTagNestedInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateManyWithoutTagNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutTagInputSchema),z.lazy(() => ProfileTagCreateWithoutTagInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutTagInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutTagInputSchema),z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyTagInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutTagInputSchema),z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutTagInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileTagUpdateManyWithWhereWithoutTagInputSchema),z.lazy(() => ProfileTagUpdateManyWithWhereWithoutTagInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileTagScalarWhereInputSchema),z.lazy(() => ProfileTagScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TagCreateNestedOneWithoutTranslationsInputSchema: z.ZodType<Prisma.TagCreateNestedOneWithoutTranslationsInput> = z.object({
  create: z.union([ z.lazy(() => TagCreateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedCreateWithoutTranslationsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TagCreateOrConnectWithoutTranslationsInputSchema).optional(),
  connect: z.lazy(() => TagWhereUniqueInputSchema).optional()
}).strict();

export const TagUpdateOneRequiredWithoutTranslationsNestedInputSchema: z.ZodType<Prisma.TagUpdateOneRequiredWithoutTranslationsNestedInput> = z.object({
  create: z.union([ z.lazy(() => TagCreateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedCreateWithoutTranslationsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TagCreateOrConnectWithoutTranslationsInputSchema).optional(),
  upsert: z.lazy(() => TagUpsertWithoutTranslationsInputSchema).optional(),
  connect: z.lazy(() => TagWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TagUpdateToOneWithWhereWithoutTranslationsInputSchema),z.lazy(() => TagUpdateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedUpdateWithoutTranslationsInputSchema) ]).optional(),
}).strict();

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const TagCreateNestedOneWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagCreateNestedOneWithoutProfileTagsInput> = z.object({
  create: z.union([ z.lazy(() => TagCreateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedCreateWithoutProfileTagsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TagCreateOrConnectWithoutProfileTagsInputSchema).optional(),
  connect: z.lazy(() => TagWhereUniqueInputSchema).optional()
}).strict();

export const ProfileCreateNestedOneWithoutTagsInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutTagsInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutTagsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutTagsInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const TagUpdateOneRequiredWithoutProfileTagsNestedInputSchema: z.ZodType<Prisma.TagUpdateOneRequiredWithoutProfileTagsNestedInput> = z.object({
  create: z.union([ z.lazy(() => TagCreateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedCreateWithoutProfileTagsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => TagCreateOrConnectWithoutProfileTagsInputSchema).optional(),
  upsert: z.lazy(() => TagUpsertWithoutProfileTagsInputSchema).optional(),
  connect: z.lazy(() => TagWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => TagUpdateToOneWithWhereWithoutProfileTagsInputSchema),z.lazy(() => TagUpdateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedUpdateWithoutProfileTagsInputSchema) ]).optional(),
}).strict();

export const ProfileUpdateOneWithoutTagsNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneWithoutTagsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutTagsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutTagsInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutTagsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutTagsInputSchema),z.lazy(() => ProfileUpdateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutTagsInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutRequestsSentInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsSentInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutRequestsSentInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const UserCreateNestedOneWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutRequestsReceivedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsReceivedInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutRequestsReceivedInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const EnumConnectionTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumConnectionTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ConnectionTypeSchema).optional()
}).strict();

export const EnumConnectionStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumConnectionStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ConnectionStatusSchema).optional()
}).strict();

export const UserUpdateOneRequiredWithoutRequestsSentNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutRequestsSentNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsSentInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutRequestsSentInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutRequestsSentInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutRequestsSentInputSchema),z.lazy(() => UserUpdateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedUpdateWithoutRequestsSentInputSchema) ]).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutRequestsReceivedNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutRequestsReceivedNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsReceivedInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutRequestsReceivedInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutRequestsReceivedInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutRequestsReceivedInputSchema),z.lazy(() => UserUpdateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedUpdateWithoutRequestsReceivedInputSchema) ]).optional(),
}).strict();

export const UserCreaterolesInputSchema: z.ZodType<Prisma.UserCreaterolesInput> = z.object({
  set: z.lazy(() => UserRoleSchema).array()
}).strict();

export const ProfileCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ProfileImageCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutUserInputSchema),z.lazy(() => ProfileImageCreateWithoutUserInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestCreateNestedManyWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateNestedManyWithoutFromUserInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyFromUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestCreateNestedManyWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateNestedManyWithoutToUserInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyToUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const PushSubscriptionCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema).array(),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PushSubscriptionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateNestedOneWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutUserInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ProfileImageUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutUserInputSchema),z.lazy(() => ProfileImageCreateWithoutUserInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyFromUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestUncheckedCreateNestedManyWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedCreateNestedManyWithoutToUserInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyToUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const PushSubscriptionUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema).array(),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PushSubscriptionCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional().nullable()
}).strict();

export const UserUpdaterolesInputSchema: z.ZodType<Prisma.UserUpdaterolesInput> = z.object({
  set: z.lazy(() => UserRoleSchema).array().optional(),
  push: z.union([ z.lazy(() => UserRoleSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
}).strict();

export const ProfileUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutUserInputSchema),z.lazy(() => ProfileUpdateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const ProfileImageUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.ProfileImageUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutUserInputSchema),z.lazy(() => ProfileImageCreateWithoutUserInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileImageUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => ProfileImageUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileImageScalarWhereInputSchema),z.lazy(() => ProfileImageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestUpdateManyWithoutFromUserNestedInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyWithoutFromUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutFromUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyFromUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutFromUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutFromUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConnectionRequestScalarWhereInputSchema),z.lazy(() => ConnectionRequestScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestUpdateManyWithoutToUserNestedInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyWithoutToUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutToUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyToUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutToUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutToUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConnectionRequestScalarWhereInputSchema),z.lazy(() => ConnectionRequestScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const PushSubscriptionUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.PushSubscriptionUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema).array(),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PushSubscriptionUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => PushSubscriptionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PushSubscriptionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PushSubscriptionUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => PushSubscriptionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PushSubscriptionUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => PushSubscriptionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PushSubscriptionScalarWhereInputSchema),z.lazy(() => PushSubscriptionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateOneWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutUserInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutUserInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutUserInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutUserInputSchema),z.lazy(() => ProfileUpdateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutUserInputSchema) ]).optional(),
}).strict();

export const ProfileImageUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutUserInputSchema),z.lazy(() => ProfileImageCreateWithoutUserInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileImageUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => ProfileImageUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileImageScalarWhereInputSchema),z.lazy(() => ProfileImageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutFromUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutFromUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyFromUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutFromUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutFromUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConnectionRequestScalarWhereInputSchema),z.lazy(() => ConnectionRequestScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema).array(),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema),z.lazy(() => ConnectionRequestCreateOrConnectWithoutToUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUpsertWithWhereUniqueWithoutToUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConnectionRequestCreateManyToUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConnectionRequestWhereUniqueInputSchema),z.lazy(() => ConnectionRequestWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUpdateWithWhereUniqueWithoutToUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUpdateManyWithWhereWithoutToUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConnectionRequestScalarWhereInputSchema),z.lazy(() => ConnectionRequestScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const PushSubscriptionUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema).array(),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema),z.lazy(() => PushSubscriptionCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PushSubscriptionUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => PushSubscriptionUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PushSubscriptionCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PushSubscriptionWhereUniqueInputSchema),z.lazy(() => PushSubscriptionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PushSubscriptionUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => PushSubscriptionUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PushSubscriptionUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => PushSubscriptionUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PushSubscriptionScalarWhereInputSchema),z.lazy(() => PushSubscriptionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileCreatelanguagesInputSchema: z.ZodType<Prisma.ProfileCreatelanguagesInput> = z.object({
  set: z.string().array()
}).strict();

export const ProfileCreateprefGenderInputSchema: z.ZodType<Prisma.ProfileCreateprefGenderInput> = z.object({
  set: z.lazy(() => GenderSchema).array()
}).strict();

export const ProfileCreateprefKidsInputSchema: z.ZodType<Prisma.ProfileCreateprefKidsInput> = z.object({
  set: z.lazy(() => HasKidsSchema).array()
}).strict();

export const CityCreateNestedOneWithoutProfilesInputSchema: z.ZodType<Prisma.CityCreateNestedOneWithoutProfilesInput> = z.object({
  create: z.union([ z.lazy(() => CityCreateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedCreateWithoutProfilesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CityCreateOrConnectWithoutProfilesInputSchema).optional(),
  connect: z.lazy(() => CityWhereUniqueInputSchema).optional()
}).strict();

export const UserCreateNestedOneWithoutProfileInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutProfileInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutProfileInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const ProfileTagCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileImageCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationParticipantCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationCreateNestedManyWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationCreateNestedManyWithoutProfileAInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileAInputSchema),z.lazy(() => ConversationCreateWithoutProfileAInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileAInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationCreateNestedManyWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationCreateNestedManyWithoutProfileBInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileBInputSchema),z.lazy(() => ConversationCreateWithoutProfileBInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileBInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MessageCreateNestedManyWithoutSenderInputSchema: z.ZodType<Prisma.MessageCreateNestedManyWithoutSenderInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutSenderInputSchema),z.lazy(() => MessageCreateWithoutSenderInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema),z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManySenderInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationCreateNestedManyWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationCreateNestedManyWithoutInitiatorInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateWithoutInitiatorInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyInitiatorInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema).array(),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => LocalizedProfileFieldCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileCreateNestedManyWithoutBlockedByProfilesInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileCreateNestedManyWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileCreateNestedManyWithoutBlockedProfilesInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUncheckedCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUncheckedCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateNestedManyWithoutProfileAInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileAInputSchema),z.lazy(() => ConversationCreateWithoutProfileAInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileAInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateNestedManyWithoutProfileBInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileBInputSchema),z.lazy(() => ConversationCreateWithoutProfileBInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileBInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MessageUncheckedCreateNestedManyWithoutSenderInputSchema: z.ZodType<Prisma.MessageUncheckedCreateNestedManyWithoutSenderInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutSenderInputSchema),z.lazy(() => MessageCreateWithoutSenderInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema),z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManySenderInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateNestedManyWithoutInitiatorInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateWithoutInitiatorInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyInitiatorInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInput> = z.object({
  create: z.union([ z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema).array(),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => LocalizedProfileFieldCreateManyProfileInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileUpdatelanguagesInputSchema: z.ZodType<Prisma.ProfileUpdatelanguagesInput> = z.object({
  set: z.string().array().optional(),
  push: z.union([ z.string(),z.string().array() ]).optional(),
}).strict();

export const NullableEnumGenderFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumGenderFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => GenderSchema).optional().nullable()
}).strict();

export const NullableEnumPronounsFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumPronounsFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => PronounsSchema).optional().nullable()
}).strict();

export const NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumRelationshipStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => RelationshipStatusSchema).optional().nullable()
}).strict();

export const NullableEnumHasKidsFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableEnumHasKidsFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => HasKidsSchema).optional().nullable()
}).strict();

export const NullableIntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableIntFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const ProfileUpdateprefGenderInputSchema: z.ZodType<Prisma.ProfileUpdateprefGenderInput> = z.object({
  set: z.lazy(() => GenderSchema).array().optional(),
  push: z.union([ z.lazy(() => GenderSchema),z.lazy(() => GenderSchema).array() ]).optional(),
}).strict();

export const ProfileUpdateprefKidsInputSchema: z.ZodType<Prisma.ProfileUpdateprefKidsInput> = z.object({
  set: z.lazy(() => HasKidsSchema).array().optional(),
  push: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const CityUpdateOneWithoutProfilesNestedInputSchema: z.ZodType<Prisma.CityUpdateOneWithoutProfilesNestedInput> = z.object({
  create: z.union([ z.lazy(() => CityCreateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedCreateWithoutProfilesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => CityCreateOrConnectWithoutProfilesInputSchema).optional(),
  upsert: z.lazy(() => CityUpsertWithoutProfilesInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => CityWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => CityWhereInputSchema) ]).optional(),
  connect: z.lazy(() => CityWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => CityUpdateToOneWithWhereWithoutProfilesInputSchema),z.lazy(() => CityUpdateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedUpdateWithoutProfilesInputSchema) ]).optional(),
}).strict();

export const UserUpdateOneRequiredWithoutProfileNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutProfileInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutProfileInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutProfileInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutProfileInputSchema),z.lazy(() => UserUpdateWithoutProfileInputSchema),z.lazy(() => UserUncheckedUpdateWithoutProfileInputSchema) ]).optional(),
}).strict();

export const ProfileTagUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.ProfileTagUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileTagUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => ProfileTagUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileTagScalarWhereInputSchema),z.lazy(() => ProfileTagScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileImageUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.ProfileImageUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileImageUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => ProfileImageUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileImageScalarWhereInputSchema),z.lazy(() => ProfileImageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationParticipantUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationParticipantScalarWhereInputSchema),z.lazy(() => ConversationParticipantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationUpdateManyWithoutProfileANestedInputSchema: z.ZodType<Prisma.ConversationUpdateManyWithoutProfileANestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileAInputSchema),z.lazy(() => ConversationCreateWithoutProfileAInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileAInputSchema),z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileAInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileAInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileAInputSchema),z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileAInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileAInputSchema),z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileAInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationUpdateManyWithoutProfileBNestedInputSchema: z.ZodType<Prisma.ConversationUpdateManyWithoutProfileBNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileBInputSchema),z.lazy(() => ConversationCreateWithoutProfileBInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileBInputSchema),z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileBInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileBInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileBInputSchema),z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileBInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileBInputSchema),z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileBInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MessageUpdateManyWithoutSenderNestedInputSchema: z.ZodType<Prisma.MessageUpdateManyWithoutSenderNestedInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutSenderInputSchema),z.lazy(() => MessageCreateWithoutSenderInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema),z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutSenderInputSchema),z.lazy(() => MessageUpsertWithWhereUniqueWithoutSenderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManySenderInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutSenderInputSchema),z.lazy(() => MessageUpdateWithWhereUniqueWithoutSenderInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutSenderInputSchema),z.lazy(() => MessageUpdateManyWithWhereWithoutSenderInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema),z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationUpdateManyWithoutInitiatorNestedInputSchema: z.ZodType<Prisma.ConversationUpdateManyWithoutInitiatorNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateWithoutInitiatorInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationUpsertWithWhereUniqueWithoutInitiatorInputSchema),z.lazy(() => ConversationUpsertWithWhereUniqueWithoutInitiatorInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyInitiatorInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateWithWhereUniqueWithoutInitiatorInputSchema),z.lazy(() => ConversationUpdateWithWhereUniqueWithoutInitiatorInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationUpdateManyWithWhereWithoutInitiatorInputSchema),z.lazy(() => ConversationUpdateManyWithWhereWithoutInitiatorInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema).array(),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => LocalizedProfileFieldUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => LocalizedProfileFieldCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => LocalizedProfileFieldUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => LocalizedProfileFieldUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema),z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema: z.ZodType<Prisma.ProfileUpdateManyWithoutBlockedByProfilesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema: z.ZodType<Prisma.ProfileUpdateManyWithoutBlockedProfilesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedProfilesInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedProfilesInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedProfilesInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileTagCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileTagUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileTagCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileTagWhereUniqueInputSchema),z.lazy(() => ProfileTagWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileTagUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileTagUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => ProfileTagUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileTagScalarWhereInputSchema),z.lazy(() => ProfileTagScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateWithoutProfileInputSchema).array(),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ProfileImageCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileImageUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ProfileImageCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileImageWhereUniqueInputSchema),z.lazy(() => ProfileImageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ProfileImageUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileImageUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => ProfileImageUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileImageScalarWhereInputSchema),z.lazy(() => ProfileImageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationParticipantScalarWhereInputSchema),z.lazy(() => ConversationParticipantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyWithoutProfileANestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileAInputSchema),z.lazy(() => ConversationCreateWithoutProfileAInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileAInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileAInputSchema),z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileAInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileAInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileAInputSchema),z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileAInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileAInputSchema),z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileAInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyWithoutProfileBNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileBInputSchema),z.lazy(() => ConversationCreateWithoutProfileBInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutProfileBInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileBInputSchema),z.lazy(() => ConversationUpsertWithWhereUniqueWithoutProfileBInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyProfileBInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileBInputSchema),z.lazy(() => ConversationUpdateWithWhereUniqueWithoutProfileBInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileBInputSchema),z.lazy(() => ConversationUpdateManyWithWhereWithoutProfileBInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MessageUncheckedUpdateManyWithoutSenderNestedInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutSenderNestedInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutSenderInputSchema),z.lazy(() => MessageCreateWithoutSenderInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema),z.lazy(() => MessageCreateOrConnectWithoutSenderInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutSenderInputSchema),z.lazy(() => MessageUpsertWithWhereUniqueWithoutSenderInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManySenderInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutSenderInputSchema),z.lazy(() => MessageUpdateWithWhereUniqueWithoutSenderInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutSenderInputSchema),z.lazy(() => MessageUpdateManyWithWhereWithoutSenderInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema),z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyWithoutInitiatorNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateWithoutInitiatorInputSchema).array(),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema),z.lazy(() => ConversationCreateOrConnectWithoutInitiatorInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationUpsertWithWhereUniqueWithoutInitiatorInputSchema),z.lazy(() => ConversationUpsertWithWhereUniqueWithoutInitiatorInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationCreateManyInitiatorInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationWhereUniqueInputSchema),z.lazy(() => ConversationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateWithWhereUniqueWithoutInitiatorInputSchema),z.lazy(() => ConversationUpdateWithWhereUniqueWithoutInitiatorInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationUpdateManyWithWhereWithoutInitiatorInputSchema),z.lazy(() => ConversationUpdateManyWithWhereWithoutInitiatorInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInput> = z.object({
  create: z.union([ z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema).array(),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => LocalizedProfileFieldUpsertWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUpsertWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  createMany: z.lazy(() => LocalizedProfileFieldCreateManyProfileInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => LocalizedProfileFieldUpdateWithWhereUniqueWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUpdateWithWhereUniqueWithoutProfileInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => LocalizedProfileFieldUpdateManyWithWhereWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUpdateManyWithWhereWithoutProfileInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema),z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedByProfilesInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema).array(),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileCreateOrConnectWithoutBlockedProfilesInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUpsertWithWhereUniqueWithoutBlockedProfilesInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ProfileWhereUniqueInputSchema),z.lazy(() => ProfileWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUpdateWithWhereUniqueWithoutBlockedProfilesInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUpdateManyWithWhereWithoutBlockedProfilesInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesCreateprefGenderInputSchema: z.ZodType<Prisma.DatingPreferencesCreateprefGenderInput> = z.object({
  set: z.lazy(() => GenderSchema).array()
}).strict();

export const DatingPreferencesCreateprefKidsInputSchema: z.ZodType<Prisma.DatingPreferencesCreateprefKidsInput> = z.object({
  set: z.lazy(() => HasKidsSchema).array()
}).strict();

export const DatingPreferencesUpdateprefGenderInputSchema: z.ZodType<Prisma.DatingPreferencesUpdateprefGenderInput> = z.object({
  set: z.lazy(() => GenderSchema).array().optional(),
  push: z.union([ z.lazy(() => GenderSchema),z.lazy(() => GenderSchema).array() ]).optional(),
}).strict();

export const DatingPreferencesUpdateprefKidsInputSchema: z.ZodType<Prisma.DatingPreferencesUpdateprefKidsInput> = z.object({
  set: z.lazy(() => HasKidsSchema).array().optional(),
  push: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
}).strict();

export const ProfileCreateNestedOneWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutLocalizedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutLocalizedInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutLocalizedInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ProfileUpdateOneRequiredWithoutLocalizedNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneRequiredWithoutLocalizedNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutLocalizedInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutLocalizedInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutLocalizedInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutLocalizedInputSchema),z.lazy(() => ProfileUpdateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutLocalizedInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutProfileImageInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutProfileImageInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileImageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutProfileImageInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const ProfileCreateNestedOneWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutProfileImagesInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutProfileImagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutProfileImagesInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const UserUpdateOneRequiredWithoutProfileImageNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutProfileImageNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileImageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutProfileImageInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutProfileImageInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutProfileImageInputSchema),z.lazy(() => UserUpdateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedUpdateWithoutProfileImageInputSchema) ]).optional(),
}).strict();

export const ProfileUpdateOneWithoutProfileImagesNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneWithoutProfileImagesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutProfileImagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutProfileImagesInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutProfileImagesInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => ProfileWhereInputSchema) ]).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutProfileImagesInputSchema),z.lazy(() => ProfileUpdateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutProfileImagesInputSchema) ]).optional(),
}).strict();

export const ProfileCreateNestedOneWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutConversationAsAInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsAInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationAsAInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ProfileCreateNestedOneWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutConversationAsBInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsBInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationAsBInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ConversationParticipantCreateNestedManyWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantCreateNestedManyWithoutConversationInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyConversationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MessageCreateNestedManyWithoutConversationInputSchema: z.ZodType<Prisma.MessageCreateNestedManyWithoutConversationInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutConversationInputSchema),z.lazy(() => MessageCreateWithoutConversationInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema),z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyConversationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ProfileCreateNestedOneWithoutConversationInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutConversationInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ConversationParticipantUncheckedCreateNestedManyWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedCreateNestedManyWithoutConversationInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyConversationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const MessageUncheckedCreateNestedManyWithoutConversationInputSchema: z.ZodType<Prisma.MessageUncheckedCreateNestedManyWithoutConversationInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutConversationInputSchema),z.lazy(() => MessageCreateWithoutConversationInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema),z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyConversationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const EnumConversationStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumConversationStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ConversationStatusSchema).optional()
}).strict();

export const ProfileUpdateOneRequiredWithoutConversationAsANestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneRequiredWithoutConversationAsANestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsAInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationAsAInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutConversationAsAInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutConversationAsAInputSchema),z.lazy(() => ProfileUpdateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationAsAInputSchema) ]).optional(),
}).strict();

export const ProfileUpdateOneRequiredWithoutConversationAsBNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneRequiredWithoutConversationAsBNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsBInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationAsBInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutConversationAsBInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutConversationAsBInputSchema),z.lazy(() => ProfileUpdateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationAsBInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantUpdateManyWithoutConversationNestedInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyWithoutConversationNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyConversationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutConversationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationParticipantScalarWhereInputSchema),z.lazy(() => ConversationParticipantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MessageUpdateManyWithoutConversationNestedInputSchema: z.ZodType<Prisma.MessageUpdateManyWithoutConversationNestedInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutConversationInputSchema),z.lazy(() => MessageCreateWithoutConversationInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema),z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => MessageUpsertWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyConversationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => MessageUpdateWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutConversationInputSchema),z.lazy(() => MessageUpdateManyWithWhereWithoutConversationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema),z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileUpdateOneRequiredWithoutConversationNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneRequiredWithoutConversationNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutConversationInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutConversationInputSchema),z.lazy(() => ProfileUpdateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema).array(),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema),z.lazy(() => ConversationParticipantCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUpsertWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ConversationParticipantCreateManyConversationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ConversationParticipantWhereUniqueInputSchema),z.lazy(() => ConversationParticipantWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUpdateWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUpdateManyWithWhereWithoutConversationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ConversationParticipantScalarWhereInputSchema),z.lazy(() => ConversationParticipantScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const MessageUncheckedUpdateManyWithoutConversationNestedInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutConversationNestedInput> = z.object({
  create: z.union([ z.lazy(() => MessageCreateWithoutConversationInputSchema),z.lazy(() => MessageCreateWithoutConversationInputSchema).array(),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema),z.lazy(() => MessageCreateOrConnectWithoutConversationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => MessageUpsertWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => MessageUpsertWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => MessageCreateManyConversationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => MessageWhereUniqueInputSchema),z.lazy(() => MessageWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => MessageUpdateWithWhereUniqueWithoutConversationInputSchema),z.lazy(() => MessageUpdateWithWhereUniqueWithoutConversationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => MessageUpdateManyWithWhereWithoutConversationInputSchema),z.lazy(() => MessageUpdateManyWithWhereWithoutConversationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => MessageScalarWhereInputSchema),z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ProfileCreateNestedOneWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutConversationParticipantsInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationParticipantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationParticipantsInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ConversationCreateNestedOneWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationCreateNestedOneWithoutParticipantsInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutParticipantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ConversationCreateOrConnectWithoutParticipantsInputSchema).optional(),
  connect: z.lazy(() => ConversationWhereUniqueInputSchema).optional()
}).strict();

export const ProfileUpdateOneRequiredWithoutConversationParticipantsNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneRequiredWithoutConversationParticipantsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationParticipantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutConversationParticipantsInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutConversationParticipantsInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUpdateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationParticipantsInputSchema) ]).optional(),
}).strict();

export const ConversationUpdateOneRequiredWithoutParticipantsNestedInputSchema: z.ZodType<Prisma.ConversationUpdateOneRequiredWithoutParticipantsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutParticipantsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ConversationCreateOrConnectWithoutParticipantsInputSchema).optional(),
  upsert: z.lazy(() => ConversationUpsertWithoutParticipantsInputSchema).optional(),
  connect: z.lazy(() => ConversationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateToOneWithWhereWithoutParticipantsInputSchema),z.lazy(() => ConversationUpdateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutParticipantsInputSchema) ]).optional(),
}).strict();

export const ConversationCreateNestedOneWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationCreateNestedOneWithoutMessagesInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutMessagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ConversationCreateOrConnectWithoutMessagesInputSchema).optional(),
  connect: z.lazy(() => ConversationWhereUniqueInputSchema).optional()
}).strict();

export const ProfileCreateNestedOneWithoutMessageInputSchema: z.ZodType<Prisma.ProfileCreateNestedOneWithoutMessageInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutMessageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutMessageInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional()
}).strict();

export const ConversationUpdateOneRequiredWithoutMessagesNestedInputSchema: z.ZodType<Prisma.ConversationUpdateOneRequiredWithoutMessagesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ConversationCreateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutMessagesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ConversationCreateOrConnectWithoutMessagesInputSchema).optional(),
  upsert: z.lazy(() => ConversationUpsertWithoutMessagesInputSchema).optional(),
  connect: z.lazy(() => ConversationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ConversationUpdateToOneWithWhereWithoutMessagesInputSchema),z.lazy(() => ConversationUpdateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutMessagesInputSchema) ]).optional(),
}).strict();

export const ProfileUpdateOneRequiredWithoutMessageNestedInputSchema: z.ZodType<Prisma.ProfileUpdateOneRequiredWithoutMessageNestedInput> = z.object({
  create: z.union([ z.lazy(() => ProfileCreateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutMessageInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ProfileCreateOrConnectWithoutMessageInputSchema).optional(),
  upsert: z.lazy(() => ProfileUpsertWithoutMessageInputSchema).optional(),
  connect: z.lazy(() => ProfileWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ProfileUpdateToOneWithWhereWithoutMessageInputSchema),z.lazy(() => ProfileUpdateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutMessageInputSchema) ]).optional(),
}).strict();

export const UserCreateNestedOneWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutPushSubscriptionInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedCreateWithoutPushSubscriptionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutPushSubscriptionInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export const UserUpdateOneRequiredWithoutPushSubscriptionNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutPushSubscriptionNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedCreateWithoutPushSubscriptionInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutPushSubscriptionInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutPushSubscriptionInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutPushSubscriptionInputSchema),z.lazy(() => UserUpdateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedUpdateWithoutPushSubscriptionInputSchema) ]).optional(),
}).strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const NestedFloatNullableFilterSchema: z.ZodType<Prisma.NestedFloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolFilterSchema) ]).optional(),
}).strict();

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const NestedFloatNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedFloatNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatNullableFilterSchema).optional()
}).strict();

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z.object({
  equals: z.boolean().optional(),
  not: z.union([ z.boolean(),z.lazy(() => NestedBoolWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedBoolFilterSchema).optional(),
  _max: z.lazy(() => NestedBoolFilterSchema).optional()
}).strict();

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const NestedIntWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedIntFilterSchema).optional(),
  _max: z.lazy(() => NestedIntFilterSchema).optional()
}).strict();

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const NestedEnumConnectionTypeFilterSchema: z.ZodType<Prisma.NestedEnumConnectionTypeFilter> = z.object({
  equals: z.lazy(() => ConnectionTypeSchema).optional(),
  in: z.lazy(() => ConnectionTypeSchema).array().optional(),
  notIn: z.lazy(() => ConnectionTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => NestedEnumConnectionTypeFilterSchema) ]).optional(),
}).strict();

export const NestedEnumConnectionStatusFilterSchema: z.ZodType<Prisma.NestedEnumConnectionStatusFilter> = z.object({
  equals: z.lazy(() => ConnectionStatusSchema).optional(),
  in: z.lazy(() => ConnectionStatusSchema).array().optional(),
  notIn: z.lazy(() => ConnectionStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => NestedEnumConnectionStatusFilterSchema) ]).optional(),
}).strict();

export const NestedEnumConnectionTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumConnectionTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ConnectionTypeSchema).optional(),
  in: z.lazy(() => ConnectionTypeSchema).array().optional(),
  notIn: z.lazy(() => ConnectionTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => NestedEnumConnectionTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumConnectionTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumConnectionTypeFilterSchema).optional()
}).strict();

export const NestedEnumConnectionStatusWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumConnectionStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ConnectionStatusSchema).optional(),
  in: z.lazy(() => ConnectionStatusSchema).array().optional(),
  notIn: z.lazy(() => ConnectionStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => NestedEnumConnectionStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumConnectionStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumConnectionStatusFilterSchema).optional()
}).strict();

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const NestedEnumGenderNullableFilterSchema: z.ZodType<Prisma.NestedEnumGenderNullableFilter> = z.object({
  equals: z.lazy(() => GenderSchema).optional().nullable(),
  in: z.lazy(() => GenderSchema).array().optional().nullable(),
  notIn: z.lazy(() => GenderSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NestedEnumGenderNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumPronounsNullableFilterSchema: z.ZodType<Prisma.NestedEnumPronounsNullableFilter> = z.object({
  equals: z.lazy(() => PronounsSchema).optional().nullable(),
  in: z.lazy(() => PronounsSchema).array().optional().nullable(),
  notIn: z.lazy(() => PronounsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NestedEnumPronounsNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumRelationshipStatusNullableFilterSchema: z.ZodType<Prisma.NestedEnumRelationshipStatusNullableFilter> = z.object({
  equals: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  in: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NestedEnumRelationshipStatusNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumHasKidsNullableFilterSchema: z.ZodType<Prisma.NestedEnumHasKidsNullableFilter> = z.object({
  equals: z.lazy(() => HasKidsSchema).optional().nullable(),
  in: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  notIn: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NestedEnumHasKidsNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumGenderNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumGenderNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => GenderSchema).optional().nullable(),
  in: z.lazy(() => GenderSchema).array().optional().nullable(),
  notIn: z.lazy(() => GenderSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NestedEnumGenderNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumGenderNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumGenderNullableFilterSchema).optional()
}).strict();

export const NestedEnumPronounsNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumPronounsNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PronounsSchema).optional().nullable(),
  in: z.lazy(() => PronounsSchema).array().optional().nullable(),
  notIn: z.lazy(() => PronounsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NestedEnumPronounsNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPronounsNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPronounsNullableFilterSchema).optional()
}).strict();

export const NestedEnumRelationshipStatusNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumRelationshipStatusNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  in: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  notIn: z.lazy(() => RelationshipStatusSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NestedEnumRelationshipStatusNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumRelationshipStatusNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumRelationshipStatusNullableFilterSchema).optional()
}).strict();

export const NestedEnumHasKidsNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumHasKidsNullableWithAggregatesFilter> = z.object({
  equals: z.lazy(() => HasKidsSchema).optional().nullable(),
  in: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  notIn: z.lazy(() => HasKidsSchema).array().optional().nullable(),
  not: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NestedEnumHasKidsNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumHasKidsNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumHasKidsNullableFilterSchema).optional()
}).strict();

export const NestedIntNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedIntNullableFilterSchema).optional()
}).strict();

export const NestedEnumConversationStatusFilterSchema: z.ZodType<Prisma.NestedEnumConversationStatusFilter> = z.object({
  equals: z.lazy(() => ConversationStatusSchema).optional(),
  in: z.lazy(() => ConversationStatusSchema).array().optional(),
  notIn: z.lazy(() => ConversationStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => NestedEnumConversationStatusFilterSchema) ]).optional(),
}).strict();

export const NestedEnumConversationStatusWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumConversationStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ConversationStatusSchema).optional(),
  in: z.lazy(() => ConversationStatusSchema).array().optional(),
  notIn: z.lazy(() => ConversationStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => NestedEnumConversationStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumConversationStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumConversationStatusFilterSchema).optional()
}).strict();

export const ProfileCreateWithoutCityInputSchema: z.ZodType<Prisma.ProfileCreateWithoutCityInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutCityInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutCityInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutCityInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutCityInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema) ]),
}).strict();

export const ProfileCreateManyCityInputEnvelopeSchema: z.ZodType<Prisma.ProfileCreateManyCityInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ProfileCreateManyCityInputSchema),z.lazy(() => ProfileCreateManyCityInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ProfileUpsertWithWhereUniqueWithoutCityInputSchema: z.ZodType<Prisma.ProfileUpsertWithWhereUniqueWithoutCityInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileUpdateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutCityInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutCityInputSchema) ]),
}).strict();

export const ProfileUpdateWithWhereUniqueWithoutCityInputSchema: z.ZodType<Prisma.ProfileUpdateWithWhereUniqueWithoutCityInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutCityInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutCityInputSchema) ]),
}).strict();

export const ProfileUpdateManyWithWhereWithoutCityInputSchema: z.ZodType<Prisma.ProfileUpdateManyWithWhereWithoutCityInput> = z.object({
  where: z.lazy(() => ProfileScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileUpdateManyMutationInputSchema),z.lazy(() => ProfileUncheckedUpdateManyWithoutCityInputSchema) ]),
}).strict();

export const ProfileScalarWhereInputSchema: z.ZodType<Prisma.ProfileScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileScalarWhereInputSchema),z.lazy(() => ProfileScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  publicName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  country: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  cityName: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  cityId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  introSocial: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isSocialActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isDatingActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isActive: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isReported: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isBlocked: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isOnboarded: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  work: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  languages: z.lazy(() => StringNullableListFilterSchema).optional(),
  introDating: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  birthday: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  gender: z.union([ z.lazy(() => EnumGenderNullableFilterSchema),z.lazy(() => GenderSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => EnumPronounsNullableFilterSchema),z.lazy(() => PronounsSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => EnumRelationshipStatusNullableFilterSchema),z.lazy(() => RelationshipStatusSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => EnumHasKidsNullableFilterSchema),z.lazy(() => HasKidsSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  prefAgeMax: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  prefGender: z.lazy(() => EnumGenderNullableListFilterSchema).optional(),
  prefKids: z.lazy(() => EnumHasKidsNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const TagTranslationCreateWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationCreateWithoutTagInput> = z.object({
  locale: z.string(),
  name: z.string()
}).strict();

export const TagTranslationUncheckedCreateWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUncheckedCreateWithoutTagInput> = z.object({
  id: z.number().int().optional(),
  locale: z.string(),
  name: z.string()
}).strict();

export const TagTranslationCreateOrConnectWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationCreateOrConnectWithoutTagInput> = z.object({
  where: z.lazy(() => TagTranslationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TagTranslationCreateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema) ]),
}).strict();

export const TagTranslationCreateManyTagInputEnvelopeSchema: z.ZodType<Prisma.TagTranslationCreateManyTagInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TagTranslationCreateManyTagInputSchema),z.lazy(() => TagTranslationCreateManyTagInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ProfileTagCreateWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagCreateWithoutTagInput> = z.object({
  id: z.string().cuid().optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutTagsInputSchema).optional()
}).strict();

export const ProfileTagUncheckedCreateWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUncheckedCreateWithoutTagInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string().optional().nullable()
}).strict();

export const ProfileTagCreateOrConnectWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagCreateOrConnectWithoutTagInput> = z.object({
  where: z.lazy(() => ProfileTagWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema) ]),
}).strict();

export const ProfileTagCreateManyTagInputEnvelopeSchema: z.ZodType<Prisma.ProfileTagCreateManyTagInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ProfileTagCreateManyTagInputSchema),z.lazy(() => ProfileTagCreateManyTagInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const TagTranslationUpsertWithWhereUniqueWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUpsertWithWhereUniqueWithoutTagInput> = z.object({
  where: z.lazy(() => TagTranslationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TagTranslationUpdateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedUpdateWithoutTagInputSchema) ]),
  create: z.union([ z.lazy(() => TagTranslationCreateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedCreateWithoutTagInputSchema) ]),
}).strict();

export const TagTranslationUpdateWithWhereUniqueWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUpdateWithWhereUniqueWithoutTagInput> = z.object({
  where: z.lazy(() => TagTranslationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TagTranslationUpdateWithoutTagInputSchema),z.lazy(() => TagTranslationUncheckedUpdateWithoutTagInputSchema) ]),
}).strict();

export const TagTranslationUpdateManyWithWhereWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUpdateManyWithWhereWithoutTagInput> = z.object({
  where: z.lazy(() => TagTranslationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TagTranslationUpdateManyMutationInputSchema),z.lazy(() => TagTranslationUncheckedUpdateManyWithoutTagInputSchema) ]),
}).strict();

export const TagTranslationScalarWhereInputSchema: z.ZodType<Prisma.TagTranslationScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TagTranslationScalarWhereInputSchema),z.lazy(() => TagTranslationScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TagTranslationScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TagTranslationScalarWhereInputSchema),z.lazy(() => TagTranslationScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  tagId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const ProfileTagUpsertWithWhereUniqueWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUpsertWithWhereUniqueWithoutTagInput> = z.object({
  where: z.lazy(() => ProfileTagWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileTagUpdateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedUpdateWithoutTagInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutTagInputSchema) ]),
}).strict();

export const ProfileTagUpdateWithWhereUniqueWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUpdateWithWhereUniqueWithoutTagInput> = z.object({
  where: z.lazy(() => ProfileTagWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileTagUpdateWithoutTagInputSchema),z.lazy(() => ProfileTagUncheckedUpdateWithoutTagInputSchema) ]),
}).strict();

export const ProfileTagUpdateManyWithWhereWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUpdateManyWithWhereWithoutTagInput> = z.object({
  where: z.lazy(() => ProfileTagScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileTagUpdateManyMutationInputSchema),z.lazy(() => ProfileTagUncheckedUpdateManyWithoutTagInputSchema) ]),
}).strict();

export const ProfileTagScalarWhereInputSchema: z.ZodType<Prisma.ProfileTagScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileTagScalarWhereInputSchema),z.lazy(() => ProfileTagScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileTagScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileTagScalarWhereInputSchema),z.lazy(() => ProfileTagScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  tagId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
}).strict();

export const TagCreateWithoutTranslationsInputSchema: z.ZodType<Prisma.TagCreateWithoutTranslationsInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileTags: z.lazy(() => ProfileTagCreateNestedManyWithoutTagInputSchema).optional()
}).strict();

export const TagUncheckedCreateWithoutTranslationsInputSchema: z.ZodType<Prisma.TagUncheckedCreateWithoutTranslationsInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileTags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutTagInputSchema).optional()
}).strict();

export const TagCreateOrConnectWithoutTranslationsInputSchema: z.ZodType<Prisma.TagCreateOrConnectWithoutTranslationsInput> = z.object({
  where: z.lazy(() => TagWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TagCreateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedCreateWithoutTranslationsInputSchema) ]),
}).strict();

export const TagUpsertWithoutTranslationsInputSchema: z.ZodType<Prisma.TagUpsertWithoutTranslationsInput> = z.object({
  update: z.union([ z.lazy(() => TagUpdateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedUpdateWithoutTranslationsInputSchema) ]),
  create: z.union([ z.lazy(() => TagCreateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedCreateWithoutTranslationsInputSchema) ]),
  where: z.lazy(() => TagWhereInputSchema).optional()
}).strict();

export const TagUpdateToOneWithWhereWithoutTranslationsInputSchema: z.ZodType<Prisma.TagUpdateToOneWithWhereWithoutTranslationsInput> = z.object({
  where: z.lazy(() => TagWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => TagUpdateWithoutTranslationsInputSchema),z.lazy(() => TagUncheckedUpdateWithoutTranslationsInputSchema) ]),
}).strict();

export const TagUpdateWithoutTranslationsInputSchema: z.ZodType<Prisma.TagUpdateWithoutTranslationsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileTags: z.lazy(() => ProfileTagUpdateManyWithoutTagNestedInputSchema).optional()
}).strict();

export const TagUncheckedUpdateWithoutTranslationsInputSchema: z.ZodType<Prisma.TagUncheckedUpdateWithoutTranslationsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileTags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutTagNestedInputSchema).optional()
}).strict();

export const TagCreateWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagCreateWithoutProfileTagsInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  translations: z.lazy(() => TagTranslationCreateNestedManyWithoutTagInputSchema).optional()
}).strict();

export const TagUncheckedCreateWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagUncheckedCreateWithoutProfileTagsInput> = z.object({
  id: z.string().cuid().optional(),
  slug: z.string(),
  name: z.string(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  translations: z.lazy(() => TagTranslationUncheckedCreateNestedManyWithoutTagInputSchema).optional()
}).strict();

export const TagCreateOrConnectWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagCreateOrConnectWithoutProfileTagsInput> = z.object({
  where: z.lazy(() => TagWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TagCreateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedCreateWithoutProfileTagsInputSchema) ]),
}).strict();

export const ProfileCreateWithoutTagsInputSchema: z.ZodType<Prisma.ProfileCreateWithoutTagsInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutTagsInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutTagsInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutTagsInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutTagsInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutTagsInputSchema) ]),
}).strict();

export const TagUpsertWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagUpsertWithoutProfileTagsInput> = z.object({
  update: z.union([ z.lazy(() => TagUpdateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedUpdateWithoutProfileTagsInputSchema) ]),
  create: z.union([ z.lazy(() => TagCreateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedCreateWithoutProfileTagsInputSchema) ]),
  where: z.lazy(() => TagWhereInputSchema).optional()
}).strict();

export const TagUpdateToOneWithWhereWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagUpdateToOneWithWhereWithoutProfileTagsInput> = z.object({
  where: z.lazy(() => TagWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => TagUpdateWithoutProfileTagsInputSchema),z.lazy(() => TagUncheckedUpdateWithoutProfileTagsInputSchema) ]),
}).strict();

export const TagUpdateWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagUpdateWithoutProfileTagsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  translations: z.lazy(() => TagTranslationUpdateManyWithoutTagNestedInputSchema).optional()
}).strict();

export const TagUncheckedUpdateWithoutProfileTagsInputSchema: z.ZodType<Prisma.TagUncheckedUpdateWithoutProfileTagsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  slug: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  translations: z.lazy(() => TagTranslationUncheckedUpdateManyWithoutTagNestedInputSchema).optional()
}).strict();

export const ProfileUpsertWithoutTagsInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutTagsInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutTagsInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutTagsInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutTagsInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutTagsInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutTagsInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutTagsInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutTagsInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutTagsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutTagsInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutTagsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const UserCreateWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserCreateWithoutRequestsSentInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageCreateNestedManyWithoutUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutRequestsSentInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutRequestsSentInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsSentInputSchema) ]),
}).strict();

export const UserCreateWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserCreateWithoutRequestsReceivedInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestCreateNestedManyWithoutFromUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutRequestsReceivedInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutRequestsReceivedInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsReceivedInputSchema) ]),
}).strict();

export const UserUpsertWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserUpsertWithoutRequestsSentInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedUpdateWithoutRequestsSentInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsSentInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutRequestsSentInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutRequestsSentInputSchema),z.lazy(() => UserUncheckedUpdateWithoutRequestsSentInputSchema) ]),
}).strict();

export const UserUpdateWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserUpdateWithoutRequestsSentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutRequestsSentInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutRequestsSentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUpsertWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserUpsertWithoutRequestsReceivedInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedUpdateWithoutRequestsReceivedInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedCreateWithoutRequestsReceivedInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutRequestsReceivedInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutRequestsReceivedInputSchema),z.lazy(() => UserUncheckedUpdateWithoutRequestsReceivedInputSchema) ]),
}).strict();

export const UserUpdateWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserUpdateWithoutRequestsReceivedInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUpdateManyWithoutFromUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutRequestsReceivedInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutRequestsReceivedInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const ProfileCreateWithoutUserInputSchema: z.ZodType<Prisma.ProfileCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const ProfileImageCreateWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutProfileImagesInputSchema).optional()
}).strict();

export const ProfileImageUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string().optional().nullable(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional()
}).strict();

export const ProfileImageCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => ProfileImageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const ProfileImageCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.ProfileImageCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ProfileImageCreateManyUserInputSchema),z.lazy(() => ProfileImageCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ConnectionRequestCreateWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateWithoutFromUserInput> = z.object({
  id: z.string().cuid().optional(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional(),
  toUser: z.lazy(() => UserCreateNestedOneWithoutRequestsReceivedInputSchema)
}).strict();

export const ConnectionRequestUncheckedCreateWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedCreateWithoutFromUserInput> = z.object({
  id: z.string().cuid().optional(),
  toUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConnectionRequestCreateOrConnectWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateOrConnectWithoutFromUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema) ]),
}).strict();

export const ConnectionRequestCreateManyFromUserInputEnvelopeSchema: z.ZodType<Prisma.ConnectionRequestCreateManyFromUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConnectionRequestCreateManyFromUserInputSchema),z.lazy(() => ConnectionRequestCreateManyFromUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ConnectionRequestCreateWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateWithoutToUserInput> = z.object({
  id: z.string().cuid().optional(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional(),
  fromUser: z.lazy(() => UserCreateNestedOneWithoutRequestsSentInputSchema)
}).strict();

export const ConnectionRequestUncheckedCreateWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedCreateWithoutToUserInput> = z.object({
  id: z.string().cuid().optional(),
  fromUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConnectionRequestCreateOrConnectWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateOrConnectWithoutToUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema) ]),
}).strict();

export const ConnectionRequestCreateManyToUserInputEnvelopeSchema: z.ZodType<Prisma.ConnectionRequestCreateManyToUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConnectionRequestCreateManyToUserInputSchema),z.lazy(() => ConnectionRequestCreateManyToUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const PushSubscriptionCreateWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  deviceInfo: z.string().optional().nullable(),
  lastSeen: z.coerce.date().optional().nullable()
}).strict();

export const PushSubscriptionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().cuid().optional(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  deviceInfo: z.string().optional().nullable(),
  lastSeen: z.coerce.date().optional().nullable()
}).strict();

export const PushSubscriptionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => PushSubscriptionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const PushSubscriptionCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.PushSubscriptionCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => PushSubscriptionCreateManyUserInputSchema),z.lazy(() => PushSubscriptionCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ProfileUpsertWithoutUserInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutUserInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutUserInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutUserInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutUserInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutUserInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileImageUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => ProfileImageWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileImageUpdateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const ProfileImageUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => ProfileImageWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileImageUpdateWithoutUserInputSchema),z.lazy(() => ProfileImageUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const ProfileImageUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => ProfileImageScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileImageUpdateManyMutationInputSchema),z.lazy(() => ProfileImageUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const ProfileImageScalarWhereInputSchema: z.ZodType<Prisma.ProfileImageScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ProfileImageScalarWhereInputSchema),z.lazy(() => ProfileImageScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ProfileImageScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ProfileImageScalarWhereInputSchema),z.lazy(() => ProfileImageScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  position: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  altText: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  storagePath: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  url: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  width: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  height: z.union([ z.lazy(() => IntNullableFilterSchema),z.number() ]).optional().nullable(),
  mimeType: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  contentHash: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  isModerated: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isFlagged: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
}).strict();

export const ConnectionRequestUpsertWithWhereUniqueWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpsertWithWhereUniqueWithoutFromUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConnectionRequestUpdateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedUpdateWithoutFromUserInputSchema) ]),
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutFromUserInputSchema) ]),
}).strict();

export const ConnectionRequestUpdateWithWhereUniqueWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateWithWhereUniqueWithoutFromUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConnectionRequestUpdateWithoutFromUserInputSchema),z.lazy(() => ConnectionRequestUncheckedUpdateWithoutFromUserInputSchema) ]),
}).strict();

export const ConnectionRequestUpdateManyWithWhereWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyWithWhereWithoutFromUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConnectionRequestUpdateManyMutationInputSchema),z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutFromUserInputSchema) ]),
}).strict();

export const ConnectionRequestScalarWhereInputSchema: z.ZodType<Prisma.ConnectionRequestScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ConnectionRequestScalarWhereInputSchema),z.lazy(() => ConnectionRequestScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConnectionRequestScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConnectionRequestScalarWhereInputSchema),z.lazy(() => ConnectionRequestScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  fromUserId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toUserId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  scope: z.union([ z.lazy(() => EnumConnectionTypeFilterSchema),z.lazy(() => ConnectionTypeSchema) ]).optional(),
  status: z.union([ z.lazy(() => EnumConnectionStatusFilterSchema),z.lazy(() => ConnectionStatusSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ConnectionRequestUpsertWithWhereUniqueWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpsertWithWhereUniqueWithoutToUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConnectionRequestUpdateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedUpdateWithoutToUserInputSchema) ]),
  create: z.union([ z.lazy(() => ConnectionRequestCreateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedCreateWithoutToUserInputSchema) ]),
}).strict();

export const ConnectionRequestUpdateWithWhereUniqueWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateWithWhereUniqueWithoutToUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConnectionRequestUpdateWithoutToUserInputSchema),z.lazy(() => ConnectionRequestUncheckedUpdateWithoutToUserInputSchema) ]),
}).strict();

export const ConnectionRequestUpdateManyWithWhereWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyWithWhereWithoutToUserInput> = z.object({
  where: z.lazy(() => ConnectionRequestScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConnectionRequestUpdateManyMutationInputSchema),z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutToUserInputSchema) ]),
}).strict();

export const PushSubscriptionUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => PushSubscriptionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => PushSubscriptionUpdateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => PushSubscriptionCreateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export const PushSubscriptionUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => PushSubscriptionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => PushSubscriptionUpdateWithoutUserInputSchema),z.lazy(() => PushSubscriptionUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export const PushSubscriptionUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => PushSubscriptionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => PushSubscriptionUpdateManyMutationInputSchema),z.lazy(() => PushSubscriptionUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export const PushSubscriptionScalarWhereInputSchema: z.ZodType<Prisma.PushSubscriptionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => PushSubscriptionScalarWhereInputSchema),z.lazy(() => PushSubscriptionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PushSubscriptionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PushSubscriptionScalarWhereInputSchema),z.lazy(() => PushSubscriptionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  endpoint: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  p256dh: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  auth: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  deviceInfo: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  lastSeen: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
}).strict();

export const CityCreateWithoutProfilesInputSchema: z.ZodType<Prisma.CityCreateWithoutProfilesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  country: z.string(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const CityUncheckedCreateWithoutProfilesInputSchema: z.ZodType<Prisma.CityUncheckedCreateWithoutProfilesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  country: z.string(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
  isUserCreated: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const CityCreateOrConnectWithoutProfilesInputSchema: z.ZodType<Prisma.CityCreateOrConnectWithoutProfilesInput> = z.object({
  where: z.lazy(() => CityWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => CityCreateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedCreateWithoutProfilesInputSchema) ]),
}).strict();

export const UserCreateWithoutProfileInputSchema: z.ZodType<Prisma.UserCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  ProfileImage: z.lazy(() => ProfileImageCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutProfileInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutProfileInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutProfileInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutProfileInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileTagCreateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  tag: z.lazy(() => TagCreateNestedOneWithoutProfileTagsInputSchema)
}).strict();

export const ProfileTagUncheckedCreateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUncheckedCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  tagId: z.string()
}).strict();

export const ProfileTagCreateOrConnectWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagCreateOrConnectWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileTagWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileTagCreateManyProfileInputEnvelopeSchema: z.ZodType<Prisma.ProfileTagCreateManyProfileInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ProfileTagCreateManyProfileInputSchema),z.lazy(() => ProfileTagCreateManyProfileInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ProfileImageCreateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileImageInputSchema)
}).strict();

export const ProfileImageUncheckedCreateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUncheckedCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional()
}).strict();

export const ProfileImageCreateOrConnectWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageCreateOrConnectWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileImageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileImageCreateManyProfileInputEnvelopeSchema: z.ZodType<Prisma.ProfileImageCreateManyProfileInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ProfileImageCreateManyProfileInputSchema),z.lazy(() => ProfileImageCreateManyProfileInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ConversationParticipantCreateWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  conversation: z.lazy(() => ConversationCreateNestedOneWithoutParticipantsInputSchema)
}).strict();

export const ConversationParticipantUncheckedCreateWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  conversationId: z.string(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional()
}).strict();

export const ConversationParticipantCreateOrConnectWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantCreateOrConnectWithoutProfileInput> = z.object({
  where: z.lazy(() => ConversationParticipantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ConversationParticipantCreateManyProfileInputEnvelopeSchema: z.ZodType<Prisma.ConversationParticipantCreateManyProfileInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConversationParticipantCreateManyProfileInputSchema),z.lazy(() => ConversationParticipantCreateManyProfileInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ConversationCreateWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationCreateWithoutProfileAInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  profileB: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsBInputSchema),
  participants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutConversationInputSchema).optional(),
  initiator: z.lazy(() => ProfileCreateNestedOneWithoutConversationInputSchema)
}).strict();

export const ConversationUncheckedCreateWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateWithoutProfileAInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string(),
  participants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationCreateOrConnectWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationCreateOrConnectWithoutProfileAInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema) ]),
}).strict();

export const ConversationCreateManyProfileAInputEnvelopeSchema: z.ZodType<Prisma.ConversationCreateManyProfileAInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConversationCreateManyProfileAInputSchema),z.lazy(() => ConversationCreateManyProfileAInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ConversationCreateWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationCreateWithoutProfileBInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  profileA: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsAInputSchema),
  participants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutConversationInputSchema).optional(),
  initiator: z.lazy(() => ProfileCreateNestedOneWithoutConversationInputSchema)
}).strict();

export const ConversationUncheckedCreateWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateWithoutProfileBInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string(),
  participants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationCreateOrConnectWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationCreateOrConnectWithoutProfileBInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema) ]),
}).strict();

export const ConversationCreateManyProfileBInputEnvelopeSchema: z.ZodType<Prisma.ConversationCreateManyProfileBInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConversationCreateManyProfileBInputSchema),z.lazy(() => ConversationCreateManyProfileBInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const MessageCreateWithoutSenderInputSchema: z.ZodType<Prisma.MessageCreateWithoutSenderInput> = z.object({
  id: z.string().cuid().optional(),
  content: z.string(),
  createdAt: z.coerce.date().optional(),
  conversation: z.lazy(() => ConversationCreateNestedOneWithoutMessagesInputSchema)
}).strict();

export const MessageUncheckedCreateWithoutSenderInputSchema: z.ZodType<Prisma.MessageUncheckedCreateWithoutSenderInput> = z.object({
  id: z.string().cuid().optional(),
  conversationId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const MessageCreateOrConnectWithoutSenderInputSchema: z.ZodType<Prisma.MessageCreateOrConnectWithoutSenderInput> = z.object({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MessageCreateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema) ]),
}).strict();

export const MessageCreateManySenderInputEnvelopeSchema: z.ZodType<Prisma.MessageCreateManySenderInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MessageCreateManySenderInputSchema),z.lazy(() => MessageCreateManySenderInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ConversationCreateWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationCreateWithoutInitiatorInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  profileA: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsAInputSchema),
  profileB: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsBInputSchema),
  participants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationUncheckedCreateWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateWithoutInitiatorInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  participants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutConversationInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationCreateOrConnectWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationCreateOrConnectWithoutInitiatorInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema) ]),
}).strict();

export const ConversationCreateManyInitiatorInputEnvelopeSchema: z.ZodType<Prisma.ConversationCreateManyInitiatorInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConversationCreateManyInitiatorInputSchema),z.lazy(() => ConversationCreateManyInitiatorInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const LocalizedProfileFieldCreateWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  field: z.string(),
  locale: z.string(),
  value: z.string()
}).strict();

export const LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedCreateWithoutProfileInput> = z.object({
  id: z.string().cuid().optional(),
  field: z.string(),
  locale: z.string(),
  value: z.string()
}).strict();

export const LocalizedProfileFieldCreateOrConnectWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateOrConnectWithoutProfileInput> = z.object({
  where: z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const LocalizedProfileFieldCreateManyProfileInputEnvelopeSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateManyProfileInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => LocalizedProfileFieldCreateManyProfileInputSchema),z.lazy(() => LocalizedProfileFieldCreateManyProfileInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ProfileCreateWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileCreateWithoutBlockedByProfilesInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutBlockedByProfilesInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutBlockedByProfilesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema) ]),
}).strict();

export const ProfileCreateWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileCreateWithoutBlockedProfilesInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutBlockedProfilesInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutBlockedProfilesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema) ]),
}).strict();

export const CityUpsertWithoutProfilesInputSchema: z.ZodType<Prisma.CityUpsertWithoutProfilesInput> = z.object({
  update: z.union([ z.lazy(() => CityUpdateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedUpdateWithoutProfilesInputSchema) ]),
  create: z.union([ z.lazy(() => CityCreateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedCreateWithoutProfilesInputSchema) ]),
  where: z.lazy(() => CityWhereInputSchema).optional()
}).strict();

export const CityUpdateToOneWithWhereWithoutProfilesInputSchema: z.ZodType<Prisma.CityUpdateToOneWithWhereWithoutProfilesInput> = z.object({
  where: z.lazy(() => CityWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => CityUpdateWithoutProfilesInputSchema),z.lazy(() => CityUncheckedUpdateWithoutProfilesInputSchema) ]),
}).strict();

export const CityUpdateWithoutProfilesInputSchema: z.ZodType<Prisma.CityUpdateWithoutProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lat: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lon: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const CityUncheckedUpdateWithoutProfilesInputSchema: z.ZodType<Prisma.CityUncheckedUpdateWithoutProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lat: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lon: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isUserCreated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isApproved: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isHidden: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const UserUpsertWithoutProfileInputSchema: z.ZodType<Prisma.UserUpsertWithoutProfileInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutProfileInputSchema),z.lazy(() => UserUncheckedUpdateWithoutProfileInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutProfileInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutProfileInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutProfileInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutProfileInputSchema),z.lazy(() => UserUncheckedUpdateWithoutProfileInputSchema) ]),
}).strict();

export const UserUpdateWithoutProfileInputSchema: z.ZodType<Prisma.UserUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  ProfileImage: z.lazy(() => ProfileImageUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutProfileInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const ProfileTagUpsertWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUpsertWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileTagWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileTagUpdateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedUpdateWithoutProfileInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileTagCreateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileTagUpdateWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUpdateWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileTagWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileTagUpdateWithoutProfileInputSchema),z.lazy(() => ProfileTagUncheckedUpdateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileTagUpdateManyWithWhereWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUpdateManyWithWhereWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileTagScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileTagUpdateManyMutationInputSchema),z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileInputSchema) ]),
}).strict();

export const ProfileImageUpsertWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUpsertWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileImageWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileImageUpdateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedUpdateWithoutProfileInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileImageCreateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileImageUpdateWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUpdateWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileImageWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileImageUpdateWithoutProfileInputSchema),z.lazy(() => ProfileImageUncheckedUpdateWithoutProfileInputSchema) ]),
}).strict();

export const ProfileImageUpdateManyWithWhereWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUpdateManyWithWhereWithoutProfileInput> = z.object({
  where: z.lazy(() => ProfileImageScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileImageUpdateManyMutationInputSchema),z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileInputSchema) ]),
}).strict();

export const ConversationParticipantUpsertWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUpsertWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => ConversationParticipantWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConversationParticipantUpdateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedUpdateWithoutProfileInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const ConversationParticipantUpdateWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => ConversationParticipantWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConversationParticipantUpdateWithoutProfileInputSchema),z.lazy(() => ConversationParticipantUncheckedUpdateWithoutProfileInputSchema) ]),
}).strict();

export const ConversationParticipantUpdateManyWithWhereWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyWithWhereWithoutProfileInput> = z.object({
  where: z.lazy(() => ConversationParticipantScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConversationParticipantUpdateManyMutationInputSchema),z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileInputSchema) ]),
}).strict();

export const ConversationParticipantScalarWhereInputSchema: z.ZodType<Prisma.ConversationParticipantScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ConversationParticipantScalarWhereInputSchema),z.lazy(() => ConversationParticipantScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationParticipantScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationParticipantScalarWhereInputSchema),z.lazy(() => ConversationParticipantScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  lastReadAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  isMuted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  isArchived: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
}).strict();

export const ConversationUpsertWithWhereUniqueWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUpsertWithWhereUniqueWithoutProfileAInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConversationUpdateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutProfileAInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileAInputSchema) ]),
}).strict();

export const ConversationUpdateWithWhereUniqueWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUpdateWithWhereUniqueWithoutProfileAInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConversationUpdateWithoutProfileAInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutProfileAInputSchema) ]),
}).strict();

export const ConversationUpdateManyWithWhereWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUpdateManyWithWhereWithoutProfileAInput> = z.object({
  where: z.lazy(() => ConversationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConversationUpdateManyMutationInputSchema),z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileAInputSchema) ]),
}).strict();

export const ConversationScalarWhereInputSchema: z.ZodType<Prisma.ConversationScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ConversationScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ConversationScalarWhereInputSchema),z.lazy(() => ConversationScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  profileAId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileBId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  status: z.union([ z.lazy(() => EnumConversationStatusFilterSchema),z.lazy(() => ConversationStatusSchema) ]).optional(),
  initiatorProfileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const ConversationUpsertWithWhereUniqueWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUpsertWithWhereUniqueWithoutProfileBInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConversationUpdateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutProfileBInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationCreateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutProfileBInputSchema) ]),
}).strict();

export const ConversationUpdateWithWhereUniqueWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUpdateWithWhereUniqueWithoutProfileBInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConversationUpdateWithoutProfileBInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutProfileBInputSchema) ]),
}).strict();

export const ConversationUpdateManyWithWhereWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUpdateManyWithWhereWithoutProfileBInput> = z.object({
  where: z.lazy(() => ConversationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConversationUpdateManyMutationInputSchema),z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBInputSchema) ]),
}).strict();

export const MessageUpsertWithWhereUniqueWithoutSenderInputSchema: z.ZodType<Prisma.MessageUpsertWithWhereUniqueWithoutSenderInput> = z.object({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MessageUpdateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedUpdateWithoutSenderInputSchema) ]),
  create: z.union([ z.lazy(() => MessageCreateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedCreateWithoutSenderInputSchema) ]),
}).strict();

export const MessageUpdateWithWhereUniqueWithoutSenderInputSchema: z.ZodType<Prisma.MessageUpdateWithWhereUniqueWithoutSenderInput> = z.object({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateWithoutSenderInputSchema),z.lazy(() => MessageUncheckedUpdateWithoutSenderInputSchema) ]),
}).strict();

export const MessageUpdateManyWithWhereWithoutSenderInputSchema: z.ZodType<Prisma.MessageUpdateManyWithWhereWithoutSenderInput> = z.object({
  where: z.lazy(() => MessageScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateManyMutationInputSchema),z.lazy(() => MessageUncheckedUpdateManyWithoutSenderInputSchema) ]),
}).strict();

export const MessageScalarWhereInputSchema: z.ZodType<Prisma.MessageScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => MessageScalarWhereInputSchema),z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => MessageScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => MessageScalarWhereInputSchema),z.lazy(() => MessageScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  conversationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  senderId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  content: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ConversationUpsertWithWhereUniqueWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUpsertWithWhereUniqueWithoutInitiatorInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConversationUpdateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutInitiatorInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationCreateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutInitiatorInputSchema) ]),
}).strict();

export const ConversationUpdateWithWhereUniqueWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUpdateWithWhereUniqueWithoutInitiatorInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConversationUpdateWithoutInitiatorInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutInitiatorInputSchema) ]),
}).strict();

export const ConversationUpdateManyWithWhereWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUpdateManyWithWhereWithoutInitiatorInput> = z.object({
  where: z.lazy(() => ConversationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConversationUpdateManyMutationInputSchema),z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorInputSchema) ]),
}).strict();

export const LocalizedProfileFieldUpsertWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpsertWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => LocalizedProfileFieldUpdateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedUpdateWithoutProfileInputSchema) ]),
  create: z.union([ z.lazy(() => LocalizedProfileFieldCreateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedCreateWithoutProfileInputSchema) ]),
}).strict();

export const LocalizedProfileFieldUpdateWithWhereUniqueWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateWithWhereUniqueWithoutProfileInput> = z.object({
  where: z.lazy(() => LocalizedProfileFieldWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => LocalizedProfileFieldUpdateWithoutProfileInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedUpdateWithoutProfileInputSchema) ]),
}).strict();

export const LocalizedProfileFieldUpdateManyWithWhereWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateManyWithWhereWithoutProfileInput> = z.object({
  where: z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema),
  data: z.union([ z.lazy(() => LocalizedProfileFieldUpdateManyMutationInputSchema),z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileInputSchema) ]),
}).strict();

export const LocalizedProfileFieldScalarWhereInputSchema: z.ZodType<Prisma.LocalizedProfileFieldScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema),z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema),z.lazy(() => LocalizedProfileFieldScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  profileId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  field: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  locale: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  value: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const ProfileUpsertWithWhereUniqueWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUpsertWithWhereUniqueWithoutBlockedByProfilesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileUpdateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutBlockedByProfilesInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedByProfilesInputSchema) ]),
}).strict();

export const ProfileUpdateWithWhereUniqueWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUpdateWithWhereUniqueWithoutBlockedByProfilesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutBlockedByProfilesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutBlockedByProfilesInputSchema) ]),
}).strict();

export const ProfileUpdateManyWithWhereWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUpdateManyWithWhereWithoutBlockedByProfilesInput> = z.object({
  where: z.lazy(() => ProfileScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileUpdateManyMutationInputSchema),z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesInputSchema) ]),
}).strict();

export const ProfileUpsertWithWhereUniqueWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUpsertWithWhereUniqueWithoutBlockedProfilesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ProfileUpdateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutBlockedProfilesInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutBlockedProfilesInputSchema) ]),
}).strict();

export const ProfileUpdateWithWhereUniqueWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUpdateWithWhereUniqueWithoutBlockedProfilesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutBlockedProfilesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutBlockedProfilesInputSchema) ]),
}).strict();

export const ProfileUpdateManyWithWhereWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUpdateManyWithWhereWithoutBlockedProfilesInput> = z.object({
  where: z.lazy(() => ProfileScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ProfileUpdateManyMutationInputSchema),z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesInputSchema) ]),
}).strict();

export const ProfileCreateWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileCreateWithoutLocalizedInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutLocalizedInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutLocalizedInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutLocalizedInputSchema) ]),
}).strict();

export const ProfileUpsertWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutLocalizedInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutLocalizedInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutLocalizedInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutLocalizedInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutLocalizedInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutLocalizedInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutLocalizedInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutLocalizedInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutLocalizedInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const UserCreateWithoutProfileImageInputSchema: z.ZodType<Prisma.UserCreateWithoutProfileImageInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutProfileImageInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutProfileImageInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutToUserInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedCreateNestedManyWithoutUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutProfileImageInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutProfileImageInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileImageInputSchema) ]),
}).strict();

export const ProfileCreateWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileCreateWithoutProfileImagesInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutProfileImagesInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutProfileImagesInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutProfileImagesInputSchema) ]),
}).strict();

export const UserUpsertWithoutProfileImageInputSchema: z.ZodType<Prisma.UserUpsertWithoutProfileImageInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedUpdateWithoutProfileImageInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedCreateWithoutProfileImageInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutProfileImageInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutProfileImageInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutProfileImageInputSchema),z.lazy(() => UserUncheckedUpdateWithoutProfileImageInputSchema) ]),
}).strict();

export const UserUpdateWithoutProfileImageInputSchema: z.ZodType<Prisma.UserUpdateWithoutProfileImageInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutProfileImageInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutProfileImageInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInputSchema).optional(),
  pushSubscription: z.lazy(() => PushSubscriptionUncheckedUpdateManyWithoutUserNestedInputSchema).optional()
}).strict();

export const ProfileUpsertWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutProfileImagesInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutProfileImagesInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutProfileImagesInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutProfileImagesInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutProfileImagesInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutProfileImagesInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutProfileImagesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutProfileImagesInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutProfileImagesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileCreateWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileCreateWithoutConversationAsAInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutConversationAsAInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutConversationAsAInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsAInputSchema) ]),
}).strict();

export const ProfileCreateWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileCreateWithoutConversationAsBInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutConversationAsBInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutConversationAsBInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsBInputSchema) ]),
}).strict();

export const ConversationParticipantCreateWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantCreateWithoutConversationInput> = z.object({
  id: z.string().cuid().optional(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutConversationParticipantsInputSchema)
}).strict();

export const ConversationParticipantUncheckedCreateWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedCreateWithoutConversationInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional()
}).strict();

export const ConversationParticipantCreateOrConnectWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantCreateOrConnectWithoutConversationInput> = z.object({
  where: z.lazy(() => ConversationParticipantWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema) ]),
}).strict();

export const ConversationParticipantCreateManyConversationInputEnvelopeSchema: z.ZodType<Prisma.ConversationParticipantCreateManyConversationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ConversationParticipantCreateManyConversationInputSchema),z.lazy(() => ConversationParticipantCreateManyConversationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const MessageCreateWithoutConversationInputSchema: z.ZodType<Prisma.MessageCreateWithoutConversationInput> = z.object({
  id: z.string().cuid().optional(),
  content: z.string(),
  createdAt: z.coerce.date().optional(),
  sender: z.lazy(() => ProfileCreateNestedOneWithoutMessageInputSchema)
}).strict();

export const MessageUncheckedCreateWithoutConversationInputSchema: z.ZodType<Prisma.MessageUncheckedCreateWithoutConversationInput> = z.object({
  id: z.string().cuid().optional(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const MessageCreateOrConnectWithoutConversationInputSchema: z.ZodType<Prisma.MessageCreateOrConnectWithoutConversationInput> = z.object({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => MessageCreateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema) ]),
}).strict();

export const MessageCreateManyConversationInputEnvelopeSchema: z.ZodType<Prisma.MessageCreateManyConversationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => MessageCreateManyConversationInputSchema),z.lazy(() => MessageCreateManyConversationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ProfileCreateWithoutConversationInputSchema: z.ZodType<Prisma.ProfileCreateWithoutConversationInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutConversationInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutConversationInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutConversationInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutConversationInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationInputSchema) ]),
}).strict();

export const ProfileUpsertWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutConversationAsAInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationAsAInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsAInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutConversationAsAInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutConversationAsAInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationAsAInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutConversationAsAInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutConversationAsAInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutConversationAsAInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUpsertWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutConversationAsBInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationAsBInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationAsBInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutConversationAsBInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutConversationAsBInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationAsBInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutConversationAsBInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutConversationAsBInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutConversationAsBInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ConversationParticipantUpsertWithWhereUniqueWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUpsertWithWhereUniqueWithoutConversationInput> = z.object({
  where: z.lazy(() => ConversationParticipantWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ConversationParticipantUpdateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedUpdateWithoutConversationInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationParticipantCreateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedCreateWithoutConversationInputSchema) ]),
}).strict();

export const ConversationParticipantUpdateWithWhereUniqueWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateWithWhereUniqueWithoutConversationInput> = z.object({
  where: z.lazy(() => ConversationParticipantWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ConversationParticipantUpdateWithoutConversationInputSchema),z.lazy(() => ConversationParticipantUncheckedUpdateWithoutConversationInputSchema) ]),
}).strict();

export const ConversationParticipantUpdateManyWithWhereWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyWithWhereWithoutConversationInput> = z.object({
  where: z.lazy(() => ConversationParticipantScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ConversationParticipantUpdateManyMutationInputSchema),z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutConversationInputSchema) ]),
}).strict();

export const MessageUpsertWithWhereUniqueWithoutConversationInputSchema: z.ZodType<Prisma.MessageUpsertWithWhereUniqueWithoutConversationInput> = z.object({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => MessageUpdateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedUpdateWithoutConversationInputSchema) ]),
  create: z.union([ z.lazy(() => MessageCreateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedCreateWithoutConversationInputSchema) ]),
}).strict();

export const MessageUpdateWithWhereUniqueWithoutConversationInputSchema: z.ZodType<Prisma.MessageUpdateWithWhereUniqueWithoutConversationInput> = z.object({
  where: z.lazy(() => MessageWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateWithoutConversationInputSchema),z.lazy(() => MessageUncheckedUpdateWithoutConversationInputSchema) ]),
}).strict();

export const MessageUpdateManyWithWhereWithoutConversationInputSchema: z.ZodType<Prisma.MessageUpdateManyWithWhereWithoutConversationInput> = z.object({
  where: z.lazy(() => MessageScalarWhereInputSchema),
  data: z.union([ z.lazy(() => MessageUpdateManyMutationInputSchema),z.lazy(() => MessageUncheckedUpdateManyWithoutConversationInputSchema) ]),
}).strict();

export const ProfileUpsertWithoutConversationInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutConversationInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutConversationInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutConversationInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutConversationInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutConversationInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutConversationInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileCreateWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileCreateWithoutConversationParticipantsInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutConversationParticipantsInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedCreateNestedManyWithoutSenderInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutConversationParticipantsInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationParticipantsInputSchema) ]),
}).strict();

export const ConversationCreateWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationCreateWithoutParticipantsInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  profileA: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsAInputSchema),
  profileB: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsBInputSchema),
  messages: z.lazy(() => MessageCreateNestedManyWithoutConversationInputSchema).optional(),
  initiator: z.lazy(() => ProfileCreateNestedOneWithoutConversationInputSchema)
}).strict();

export const ConversationUncheckedCreateWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateWithoutParticipantsInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string(),
  messages: z.lazy(() => MessageUncheckedCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationCreateOrConnectWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationCreateOrConnectWithoutParticipantsInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationCreateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutParticipantsInputSchema) ]),
}).strict();

export const ProfileUpsertWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutConversationParticipantsInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationParticipantsInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutConversationParticipantsInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutConversationParticipantsInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutConversationParticipantsInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutConversationParticipantsInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutConversationParticipantsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutConversationParticipantsInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutConversationParticipantsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ConversationUpsertWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationUpsertWithoutParticipantsInput> = z.object({
  update: z.union([ z.lazy(() => ConversationUpdateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutParticipantsInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationCreateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutParticipantsInputSchema) ]),
  where: z.lazy(() => ConversationWhereInputSchema).optional()
}).strict();

export const ConversationUpdateToOneWithWhereWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationUpdateToOneWithWhereWithoutParticipantsInput> = z.object({
  where: z.lazy(() => ConversationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ConversationUpdateWithoutParticipantsInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutParticipantsInputSchema) ]),
}).strict();

export const ConversationUpdateWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationUpdateWithoutParticipantsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  profileA: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsANestedInputSchema).optional(),
  profileB: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsBNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutConversationNestedInputSchema).optional(),
  initiator: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateWithoutParticipantsInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateWithoutParticipantsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationCreateWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationCreateWithoutMessagesInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  profileA: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsAInputSchema),
  profileB: z.lazy(() => ProfileCreateNestedOneWithoutConversationAsBInputSchema),
  participants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutConversationInputSchema).optional(),
  initiator: z.lazy(() => ProfileCreateNestedOneWithoutConversationInputSchema)
}).strict();

export const ConversationUncheckedCreateWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationUncheckedCreateWithoutMessagesInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string(),
  participants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutConversationInputSchema).optional()
}).strict();

export const ConversationCreateOrConnectWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationCreateOrConnectWithoutMessagesInput> = z.object({
  where: z.lazy(() => ConversationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ConversationCreateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutMessagesInputSchema) ]),
}).strict();

export const ProfileCreateWithoutMessageInputSchema: z.ZodType<Prisma.ProfileCreateWithoutMessageInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  city: z.lazy(() => CityCreateNestedOneWithoutProfilesInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutProfileInputSchema),
  tags: z.lazy(() => ProfileTagCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationCreateNestedManyWithoutProfileBInputSchema).optional(),
  Conversation: z.lazy(() => ConversationCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileUncheckedCreateWithoutMessageInputSchema: z.ZodType<Prisma.ProfileUncheckedCreateWithoutMessageInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  cityId: z.string().optional().nullable(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.lazy(() => ProfileTagUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileAInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutProfileBInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedCreateNestedManyWithoutInitiatorInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedCreateNestedManyWithoutProfileInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedByProfilesInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedCreateNestedManyWithoutBlockedProfilesInputSchema).optional()
}).strict();

export const ProfileCreateOrConnectWithoutMessageInputSchema: z.ZodType<Prisma.ProfileCreateOrConnectWithoutMessageInput> = z.object({
  where: z.lazy(() => ProfileWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ProfileCreateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutMessageInputSchema) ]),
}).strict();

export const ConversationUpsertWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationUpsertWithoutMessagesInput> = z.object({
  update: z.union([ z.lazy(() => ConversationUpdateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutMessagesInputSchema) ]),
  create: z.union([ z.lazy(() => ConversationCreateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedCreateWithoutMessagesInputSchema) ]),
  where: z.lazy(() => ConversationWhereInputSchema).optional()
}).strict();

export const ConversationUpdateToOneWithWhereWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationUpdateToOneWithWhereWithoutMessagesInput> = z.object({
  where: z.lazy(() => ConversationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ConversationUpdateWithoutMessagesInputSchema),z.lazy(() => ConversationUncheckedUpdateWithoutMessagesInputSchema) ]),
}).strict();

export const ConversationUpdateWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationUpdateWithoutMessagesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  profileA: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsANestedInputSchema).optional(),
  profileB: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsBNestedInputSchema).optional(),
  participants: z.lazy(() => ConversationParticipantUpdateManyWithoutConversationNestedInputSchema).optional(),
  initiator: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateWithoutMessagesInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateWithoutMessagesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ProfileUpsertWithoutMessageInputSchema: z.ZodType<Prisma.ProfileUpsertWithoutMessageInput> = z.object({
  update: z.union([ z.lazy(() => ProfileUpdateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutMessageInputSchema) ]),
  create: z.union([ z.lazy(() => ProfileCreateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedCreateWithoutMessageInputSchema) ]),
  where: z.lazy(() => ProfileWhereInputSchema).optional()
}).strict();

export const ProfileUpdateToOneWithWhereWithoutMessageInputSchema: z.ZodType<Prisma.ProfileUpdateToOneWithWhereWithoutMessageInput> = z.object({
  where: z.lazy(() => ProfileWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ProfileUpdateWithoutMessageInputSchema),z.lazy(() => ProfileUncheckedUpdateWithoutMessageInputSchema) ]),
}).strict();

export const ProfileUpdateWithoutMessageInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutMessageInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutMessageInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutMessageInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const UserCreateWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserCreateWithoutPushSubscriptionInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestCreateNestedManyWithoutToUserInputSchema).optional()
}).strict();

export const UserUncheckedCreateWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutPushSubscriptionInput> = z.object({
  id: z.string().cuid().optional(),
  email: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  tokenVersion: z.number().int().optional(),
  loginToken: z.string().optional().nullable(),
  loginTokenExp: z.coerce.date().optional().nullable(),
  isOnboarded: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isRegistrationConfirmed: z.boolean().optional(),
  hasActiveProfile: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  language: z.string().optional().nullable(),
  roles: z.union([ z.lazy(() => UserCreaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutFromUserInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedCreateNestedManyWithoutToUserInputSchema).optional()
}).strict();

export const UserCreateOrConnectWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutPushSubscriptionInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedCreateWithoutPushSubscriptionInputSchema) ]),
}).strict();

export const UserUpsertWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserUpsertWithoutPushSubscriptionInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedUpdateWithoutPushSubscriptionInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedCreateWithoutPushSubscriptionInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export const UserUpdateToOneWithWhereWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutPushSubscriptionInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutPushSubscriptionInputSchema),z.lazy(() => UserUncheckedUpdateWithoutPushSubscriptionInputSchema) ]),
}).strict();

export const UserUpdateWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserUpdateWithoutPushSubscriptionInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUpdateManyWithoutToUserNestedInputSchema).optional()
}).strict();

export const UserUncheckedUpdateWithoutPushSubscriptionInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutPushSubscriptionInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  phonenumber: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  tokenVersion: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  loginToken: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  loginTokenExp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isRegistrationConfirmed: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  hasActiveProfile: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  lastLoginAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  language: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  roles: z.union([ z.lazy(() => UserUpdaterolesInputSchema),z.lazy(() => UserRoleSchema).array() ]).optional(),
  profile: z.lazy(() => ProfileUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
  ProfileImage: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  requestsSent: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutFromUserNestedInputSchema).optional(),
  requestsReceived: z.lazy(() => ConnectionRequestUncheckedUpdateManyWithoutToUserNestedInputSchema).optional()
}).strict();

export const ProfileCreateManyCityInputSchema: z.ZodType<Prisma.ProfileCreateManyCityInput> = z.object({
  id: z.string().cuid().optional(),
  publicName: z.string(),
  country: z.string().optional(),
  cityName: z.string().optional(),
  introSocial: z.string().optional(),
  isSocialActive: z.boolean().optional(),
  isDatingActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isReported: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isOnboarded: z.boolean().optional(),
  userId: z.string(),
  work: z.string().optional(),
  languages: z.union([ z.lazy(() => ProfileCreatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.string().optional(),
  birthday: z.coerce.date().optional().nullable(),
  gender: z.lazy(() => GenderSchema).optional().nullable(),
  pronouns: z.lazy(() => PronounsSchema).optional().nullable(),
  relationship: z.lazy(() => RelationshipStatusSchema).optional().nullable(),
  hasKids: z.lazy(() => HasKidsSchema).optional().nullable(),
  prefAgeMin: z.number().int().optional().nullable(),
  prefAgeMax: z.number().int().optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileCreateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileCreateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export const ProfileUpdateWithoutCityInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutCityInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutCityInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutCityInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateManyWithoutCityInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyWithoutCityInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagTranslationCreateManyTagInputSchema: z.ZodType<Prisma.TagTranslationCreateManyTagInput> = z.object({
  id: z.number().int().optional(),
  locale: z.string(),
  name: z.string()
}).strict();

export const ProfileTagCreateManyTagInputSchema: z.ZodType<Prisma.ProfileTagCreateManyTagInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string().optional().nullable()
}).strict();

export const TagTranslationUpdateWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUpdateWithoutTagInput> = z.object({
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagTranslationUncheckedUpdateWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUncheckedUpdateWithoutTagInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TagTranslationUncheckedUpdateManyWithoutTagInputSchema: z.ZodType<Prisma.TagTranslationUncheckedUpdateManyWithoutTagInput> = z.object({
  id: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileTagUpdateWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUpdateWithoutTagInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutTagsNestedInputSchema).optional()
}).strict();

export const ProfileTagUncheckedUpdateWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateWithoutTagInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ProfileTagUncheckedUpdateManyWithoutTagInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateManyWithoutTagInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ProfileImageCreateManyUserInputSchema: z.ZodType<Prisma.ProfileImageCreateManyUserInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string().optional().nullable(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional()
}).strict();

export const ConnectionRequestCreateManyFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateManyFromUserInput> = z.object({
  id: z.string().cuid().optional(),
  toUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConnectionRequestCreateManyToUserInputSchema: z.ZodType<Prisma.ConnectionRequestCreateManyToUserInput> = z.object({
  id: z.string().cuid().optional(),
  fromUserId: z.string(),
  scope: z.lazy(() => ConnectionTypeSchema),
  status: z.lazy(() => ConnectionStatusSchema),
  createdAt: z.coerce.date().optional()
}).strict();

export const PushSubscriptionCreateManyUserInputSchema: z.ZodType<Prisma.PushSubscriptionCreateManyUserInput> = z.object({
  id: z.string().cuid().optional(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  deviceInfo: z.string().optional().nullable(),
  lastSeen: z.coerce.date().optional().nullable()
}).strict();

export const ProfileImageUpdateWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneWithoutProfileImagesNestedInputSchema).optional()
}).strict();

export const ProfileImageUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileImageUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestUpdateWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateWithoutFromUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  toUser: z.lazy(() => UserUpdateOneRequiredWithoutRequestsReceivedNestedInputSchema).optional()
}).strict();

export const ConnectionRequestUncheckedUpdateWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateWithoutFromUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  toUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestUncheckedUpdateManyWithoutFromUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateManyWithoutFromUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  toUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestUpdateWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUpdateWithoutToUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  fromUser: z.lazy(() => UserUpdateOneRequiredWithoutRequestsSentNestedInputSchema).optional()
}).strict();

export const ConnectionRequestUncheckedUpdateWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateWithoutToUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  fromUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConnectionRequestUncheckedUpdateManyWithoutToUserInputSchema: z.ZodType<Prisma.ConnectionRequestUncheckedUpdateManyWithoutToUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  fromUserId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  scope: z.union([ z.lazy(() => ConnectionTypeSchema),z.lazy(() => EnumConnectionTypeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConnectionStatusSchema),z.lazy(() => EnumConnectionStatusFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PushSubscriptionUpdateWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const PushSubscriptionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const PushSubscriptionUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.PushSubscriptionUncheckedUpdateManyWithoutUserInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  endpoint: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  p256dh: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  auth: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  deviceInfo: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  lastSeen: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
}).strict();

export const ProfileTagCreateManyProfileInputSchema: z.ZodType<Prisma.ProfileTagCreateManyProfileInput> = z.object({
  id: z.string().cuid().optional(),
  tagId: z.string()
}).strict();

export const ProfileImageCreateManyProfileInputSchema: z.ZodType<Prisma.ProfileImageCreateManyProfileInput> = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  position: z.number().int().optional(),
  altText: z.string().optional(),
  storagePath: z.string(),
  url: z.string().optional().nullable(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  contentHash: z.string().optional().nullable(),
  isModerated: z.boolean().optional(),
  isFlagged: z.boolean().optional()
}).strict();

export const ConversationParticipantCreateManyProfileInputSchema: z.ZodType<Prisma.ConversationParticipantCreateManyProfileInput> = z.object({
  id: z.string().cuid().optional(),
  conversationId: z.string(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional()
}).strict();

export const ConversationCreateManyProfileAInputSchema: z.ZodType<Prisma.ConversationCreateManyProfileAInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string()
}).strict();

export const ConversationCreateManyProfileBInputSchema: z.ZodType<Prisma.ConversationCreateManyProfileBInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional(),
  initiatorProfileId: z.string()
}).strict();

export const MessageCreateManySenderInputSchema: z.ZodType<Prisma.MessageCreateManySenderInput> = z.object({
  id: z.string().cuid().optional(),
  conversationId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConversationCreateManyInitiatorInputSchema: z.ZodType<Prisma.ConversationCreateManyInitiatorInput> = z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  profileAId: z.string(),
  profileBId: z.string(),
  status: z.lazy(() => ConversationStatusSchema).optional()
}).strict();

export const LocalizedProfileFieldCreateManyProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateManyProfileInput> = z.object({
  id: z.string().cuid().optional(),
  field: z.string(),
  locale: z.string(),
  value: z.string()
}).strict();

export const ProfileTagUpdateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tag: z.lazy(() => TagUpdateOneRequiredWithoutProfileTagsNestedInputSchema).optional()
}).strict();

export const ProfileTagUncheckedUpdateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tagId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileTagUncheckedUpdateManyWithoutProfileInputSchema: z.ZodType<Prisma.ProfileTagUncheckedUpdateManyWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  tagId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileImageUpdateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileImageNestedInputSchema).optional()
}).strict();

export const ProfileImageUncheckedUpdateWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileImageUncheckedUpdateManyWithoutProfileInputSchema: z.ZodType<Prisma.ProfileImageUncheckedUpdateManyWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  position: z.union([ z.number().int(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  altText: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  storagePath: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  url: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  width: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  height: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  mimeType: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  contentHash: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isModerated: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isFlagged: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantUpdateWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  conversation: z.lazy(() => ConversationUpdateOneRequiredWithoutParticipantsNestedInputSchema).optional()
}).strict();

export const ConversationParticipantUncheckedUpdateWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantUncheckedUpdateManyWithoutProfileInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateManyWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationUpdateWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUpdateWithoutProfileAInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  profileB: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsBNestedInputSchema).optional(),
  participants: z.lazy(() => ConversationParticipantUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutConversationNestedInputSchema).optional(),
  initiator: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateWithoutProfileAInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateManyWithoutProfileAInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyWithoutProfileAInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationUpdateWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUpdateWithoutProfileBInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  profileA: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsANestedInputSchema).optional(),
  participants: z.lazy(() => ConversationParticipantUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutConversationNestedInputSchema).optional(),
  initiator: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateWithoutProfileBInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateManyWithoutProfileBInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyWithoutProfileBInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  initiatorProfileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageUpdateWithoutSenderInputSchema: z.ZodType<Prisma.MessageUpdateWithoutSenderInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  conversation: z.lazy(() => ConversationUpdateOneRequiredWithoutMessagesNestedInputSchema).optional()
}).strict();

export const MessageUncheckedUpdateWithoutSenderInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateWithoutSenderInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageUncheckedUpdateManyWithoutSenderInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutSenderInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  conversationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationUpdateWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUpdateWithoutInitiatorInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  profileA: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsANestedInputSchema).optional(),
  profileB: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationAsBNestedInputSchema).optional(),
  participants: z.lazy(() => ConversationParticipantUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateWithoutInitiatorInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
  participants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutConversationNestedInputSchema).optional(),
  messages: z.lazy(() => MessageUncheckedUpdateManyWithoutConversationNestedInputSchema).optional()
}).strict();

export const ConversationUncheckedUpdateManyWithoutInitiatorInputSchema: z.ZodType<Prisma.ConversationUncheckedUpdateManyWithoutInitiatorInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  profileAId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileBId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  status: z.union([ z.lazy(() => ConversationStatusSchema),z.lazy(() => EnumConversationStatusFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const LocalizedProfileFieldUpdateWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const LocalizedProfileFieldUncheckedUpdateWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedUpdateWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const LocalizedProfileFieldUncheckedUpdateManyWithoutProfileInputSchema: z.ZodType<Prisma.LocalizedProfileFieldUncheckedUpdateManyWithoutProfileInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  field: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  locale: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  value: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileUpdateWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutBlockedByProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutBlockedByProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedByProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateManyWithoutBlockedByProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyWithoutBlockedByProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ProfileUpdateWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUpdateWithoutBlockedProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  city: z.lazy(() => CityUpdateOneWithoutProfilesNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutProfileNestedInputSchema).optional(),
  tags: z.lazy(() => ProfileTagUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateWithoutBlockedProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tags: z.lazy(() => ProfileTagUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  profileImages: z.lazy(() => ProfileImageUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationParticipants: z.lazy(() => ConversationParticipantUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  conversationAsA: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileANestedInputSchema).optional(),
  conversationAsB: z.lazy(() => ConversationUncheckedUpdateManyWithoutProfileBNestedInputSchema).optional(),
  Message: z.lazy(() => MessageUncheckedUpdateManyWithoutSenderNestedInputSchema).optional(),
  Conversation: z.lazy(() => ConversationUncheckedUpdateManyWithoutInitiatorNestedInputSchema).optional(),
  localized: z.lazy(() => LocalizedProfileFieldUncheckedUpdateManyWithoutProfileNestedInputSchema).optional(),
  blockedByProfiles: z.lazy(() => ProfileUncheckedUpdateManyWithoutBlockedProfilesNestedInputSchema).optional()
}).strict();

export const ProfileUncheckedUpdateManyWithoutBlockedProfilesInputSchema: z.ZodType<Prisma.ProfileUncheckedUpdateManyWithoutBlockedProfilesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  publicName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  country: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityName: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  cityId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  introSocial: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isSocialActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isDatingActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isActive: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isReported: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isBlocked: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isOnboarded: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  work: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  languages: z.union([ z.lazy(() => ProfileUpdatelanguagesInputSchema),z.string().array() ]).optional(),
  introDating: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  birthday: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  gender: z.union([ z.lazy(() => GenderSchema),z.lazy(() => NullableEnumGenderFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  pronouns: z.union([ z.lazy(() => PronounsSchema),z.lazy(() => NullableEnumPronounsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  relationship: z.union([ z.lazy(() => RelationshipStatusSchema),z.lazy(() => NullableEnumRelationshipStatusFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  hasKids: z.union([ z.lazy(() => HasKidsSchema),z.lazy(() => NullableEnumHasKidsFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMin: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefAgeMax: z.union([ z.number().int(),z.lazy(() => NullableIntFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  prefGender: z.union([ z.lazy(() => ProfileUpdateprefGenderInputSchema),z.lazy(() => GenderSchema).array() ]).optional(),
  prefKids: z.union([ z.lazy(() => ProfileUpdateprefKidsInputSchema),z.lazy(() => HasKidsSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantCreateManyConversationInputSchema: z.ZodType<Prisma.ConversationParticipantCreateManyConversationInput> = z.object({
  id: z.string().cuid().optional(),
  profileId: z.string(),
  lastReadAt: z.coerce.date().optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional()
}).strict();

export const MessageCreateManyConversationInputSchema: z.ZodType<Prisma.MessageCreateManyConversationInput> = z.object({
  id: z.string().cuid().optional(),
  senderId: z.string(),
  content: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();

export const ConversationParticipantUpdateWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUpdateWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  profile: z.lazy(() => ProfileUpdateOneRequiredWithoutConversationParticipantsNestedInputSchema).optional()
}).strict();

export const ConversationParticipantUncheckedUpdateWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ConversationParticipantUncheckedUpdateManyWithoutConversationInputSchema: z.ZodType<Prisma.ConversationParticipantUncheckedUpdateManyWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  profileId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  lastReadAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isMuted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  isArchived: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageUpdateWithoutConversationInputSchema: z.ZodType<Prisma.MessageUpdateWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  sender: z.lazy(() => ProfileUpdateOneRequiredWithoutMessageNestedInputSchema).optional()
}).strict();

export const MessageUncheckedUpdateWithoutConversationInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  senderId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const MessageUncheckedUpdateManyWithoutConversationInputSchema: z.ZodType<Prisma.MessageUncheckedUpdateManyWithoutConversationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  senderId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  content: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const CityFindFirstArgsSchema: z.ZodType<Prisma.CityFindFirstArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereInputSchema.optional(),
  orderBy: z.union([ CityOrderByWithRelationInputSchema.array(),CityOrderByWithRelationInputSchema ]).optional(),
  cursor: CityWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CityScalarFieldEnumSchema,CityScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CityFindFirstOrThrowArgsSchema: z.ZodType<Prisma.CityFindFirstOrThrowArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereInputSchema.optional(),
  orderBy: z.union([ CityOrderByWithRelationInputSchema.array(),CityOrderByWithRelationInputSchema ]).optional(),
  cursor: CityWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CityScalarFieldEnumSchema,CityScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CityFindManyArgsSchema: z.ZodType<Prisma.CityFindManyArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereInputSchema.optional(),
  orderBy: z.union([ CityOrderByWithRelationInputSchema.array(),CityOrderByWithRelationInputSchema ]).optional(),
  cursor: CityWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ CityScalarFieldEnumSchema,CityScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const CityAggregateArgsSchema: z.ZodType<Prisma.CityAggregateArgs> = z.object({
  where: CityWhereInputSchema.optional(),
  orderBy: z.union([ CityOrderByWithRelationInputSchema.array(),CityOrderByWithRelationInputSchema ]).optional(),
  cursor: CityWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const CityGroupByArgsSchema: z.ZodType<Prisma.CityGroupByArgs> = z.object({
  where: CityWhereInputSchema.optional(),
  orderBy: z.union([ CityOrderByWithAggregationInputSchema.array(),CityOrderByWithAggregationInputSchema ]).optional(),
  by: CityScalarFieldEnumSchema.array(),
  having: CityScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const CityFindUniqueArgsSchema: z.ZodType<Prisma.CityFindUniqueArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereUniqueInputSchema,
}).strict() ;

export const CityFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.CityFindUniqueOrThrowArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereUniqueInputSchema,
}).strict() ;

export const TagFindFirstArgsSchema: z.ZodType<Prisma.TagFindFirstArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereInputSchema.optional(),
  orderBy: z.union([ TagOrderByWithRelationInputSchema.array(),TagOrderByWithRelationInputSchema ]).optional(),
  cursor: TagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TagScalarFieldEnumSchema,TagScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TagFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TagFindFirstOrThrowArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereInputSchema.optional(),
  orderBy: z.union([ TagOrderByWithRelationInputSchema.array(),TagOrderByWithRelationInputSchema ]).optional(),
  cursor: TagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TagScalarFieldEnumSchema,TagScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TagFindManyArgsSchema: z.ZodType<Prisma.TagFindManyArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereInputSchema.optional(),
  orderBy: z.union([ TagOrderByWithRelationInputSchema.array(),TagOrderByWithRelationInputSchema ]).optional(),
  cursor: TagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TagScalarFieldEnumSchema,TagScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TagAggregateArgsSchema: z.ZodType<Prisma.TagAggregateArgs> = z.object({
  where: TagWhereInputSchema.optional(),
  orderBy: z.union([ TagOrderByWithRelationInputSchema.array(),TagOrderByWithRelationInputSchema ]).optional(),
  cursor: TagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TagGroupByArgsSchema: z.ZodType<Prisma.TagGroupByArgs> = z.object({
  where: TagWhereInputSchema.optional(),
  orderBy: z.union([ TagOrderByWithAggregationInputSchema.array(),TagOrderByWithAggregationInputSchema ]).optional(),
  by: TagScalarFieldEnumSchema.array(),
  having: TagScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TagFindUniqueArgsSchema: z.ZodType<Prisma.TagFindUniqueArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereUniqueInputSchema,
}).strict() ;

export const TagFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TagFindUniqueOrThrowArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereUniqueInputSchema,
}).strict() ;

export const TagTranslationFindFirstArgsSchema: z.ZodType<Prisma.TagTranslationFindFirstArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereInputSchema.optional(),
  orderBy: z.union([ TagTranslationOrderByWithRelationInputSchema.array(),TagTranslationOrderByWithRelationInputSchema ]).optional(),
  cursor: TagTranslationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TagTranslationScalarFieldEnumSchema,TagTranslationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TagTranslationFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TagTranslationFindFirstOrThrowArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereInputSchema.optional(),
  orderBy: z.union([ TagTranslationOrderByWithRelationInputSchema.array(),TagTranslationOrderByWithRelationInputSchema ]).optional(),
  cursor: TagTranslationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TagTranslationScalarFieldEnumSchema,TagTranslationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TagTranslationFindManyArgsSchema: z.ZodType<Prisma.TagTranslationFindManyArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereInputSchema.optional(),
  orderBy: z.union([ TagTranslationOrderByWithRelationInputSchema.array(),TagTranslationOrderByWithRelationInputSchema ]).optional(),
  cursor: TagTranslationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TagTranslationScalarFieldEnumSchema,TagTranslationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const TagTranslationAggregateArgsSchema: z.ZodType<Prisma.TagTranslationAggregateArgs> = z.object({
  where: TagTranslationWhereInputSchema.optional(),
  orderBy: z.union([ TagTranslationOrderByWithRelationInputSchema.array(),TagTranslationOrderByWithRelationInputSchema ]).optional(),
  cursor: TagTranslationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TagTranslationGroupByArgsSchema: z.ZodType<Prisma.TagTranslationGroupByArgs> = z.object({
  where: TagTranslationWhereInputSchema.optional(),
  orderBy: z.union([ TagTranslationOrderByWithAggregationInputSchema.array(),TagTranslationOrderByWithAggregationInputSchema ]).optional(),
  by: TagTranslationScalarFieldEnumSchema.array(),
  having: TagTranslationScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const TagTranslationFindUniqueArgsSchema: z.ZodType<Prisma.TagTranslationFindUniqueArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereUniqueInputSchema,
}).strict() ;

export const TagTranslationFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TagTranslationFindUniqueOrThrowArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereUniqueInputSchema,
}).strict() ;

export const ProfileTagFindFirstArgsSchema: z.ZodType<Prisma.ProfileTagFindFirstArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereInputSchema.optional(),
  orderBy: z.union([ ProfileTagOrderByWithRelationInputSchema.array(),ProfileTagOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileTagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileTagScalarFieldEnumSchema,ProfileTagScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileTagFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ProfileTagFindFirstOrThrowArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereInputSchema.optional(),
  orderBy: z.union([ ProfileTagOrderByWithRelationInputSchema.array(),ProfileTagOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileTagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileTagScalarFieldEnumSchema,ProfileTagScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileTagFindManyArgsSchema: z.ZodType<Prisma.ProfileTagFindManyArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereInputSchema.optional(),
  orderBy: z.union([ ProfileTagOrderByWithRelationInputSchema.array(),ProfileTagOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileTagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileTagScalarFieldEnumSchema,ProfileTagScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileTagAggregateArgsSchema: z.ZodType<Prisma.ProfileTagAggregateArgs> = z.object({
  where: ProfileTagWhereInputSchema.optional(),
  orderBy: z.union([ ProfileTagOrderByWithRelationInputSchema.array(),ProfileTagOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileTagWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ProfileTagGroupByArgsSchema: z.ZodType<Prisma.ProfileTagGroupByArgs> = z.object({
  where: ProfileTagWhereInputSchema.optional(),
  orderBy: z.union([ ProfileTagOrderByWithAggregationInputSchema.array(),ProfileTagOrderByWithAggregationInputSchema ]).optional(),
  by: ProfileTagScalarFieldEnumSchema.array(),
  having: ProfileTagScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ProfileTagFindUniqueArgsSchema: z.ZodType<Prisma.ProfileTagFindUniqueArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereUniqueInputSchema,
}).strict() ;

export const ProfileTagFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ProfileTagFindUniqueOrThrowArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereUniqueInputSchema,
}).strict() ;

export const ConnectionRequestFindFirstArgsSchema: z.ZodType<Prisma.ConnectionRequestFindFirstArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereInputSchema.optional(),
  orderBy: z.union([ ConnectionRequestOrderByWithRelationInputSchema.array(),ConnectionRequestOrderByWithRelationInputSchema ]).optional(),
  cursor: ConnectionRequestWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConnectionRequestScalarFieldEnumSchema,ConnectionRequestScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConnectionRequestFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ConnectionRequestFindFirstOrThrowArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereInputSchema.optional(),
  orderBy: z.union([ ConnectionRequestOrderByWithRelationInputSchema.array(),ConnectionRequestOrderByWithRelationInputSchema ]).optional(),
  cursor: ConnectionRequestWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConnectionRequestScalarFieldEnumSchema,ConnectionRequestScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConnectionRequestFindManyArgsSchema: z.ZodType<Prisma.ConnectionRequestFindManyArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereInputSchema.optional(),
  orderBy: z.union([ ConnectionRequestOrderByWithRelationInputSchema.array(),ConnectionRequestOrderByWithRelationInputSchema ]).optional(),
  cursor: ConnectionRequestWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConnectionRequestScalarFieldEnumSchema,ConnectionRequestScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConnectionRequestAggregateArgsSchema: z.ZodType<Prisma.ConnectionRequestAggregateArgs> = z.object({
  where: ConnectionRequestWhereInputSchema.optional(),
  orderBy: z.union([ ConnectionRequestOrderByWithRelationInputSchema.array(),ConnectionRequestOrderByWithRelationInputSchema ]).optional(),
  cursor: ConnectionRequestWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ConnectionRequestGroupByArgsSchema: z.ZodType<Prisma.ConnectionRequestGroupByArgs> = z.object({
  where: ConnectionRequestWhereInputSchema.optional(),
  orderBy: z.union([ ConnectionRequestOrderByWithAggregationInputSchema.array(),ConnectionRequestOrderByWithAggregationInputSchema ]).optional(),
  by: ConnectionRequestScalarFieldEnumSchema.array(),
  having: ConnectionRequestScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ConnectionRequestFindUniqueArgsSchema: z.ZodType<Prisma.ConnectionRequestFindUniqueArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereUniqueInputSchema,
}).strict() ;

export const ConnectionRequestFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ConnectionRequestFindUniqueOrThrowArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereUniqueInputSchema,
}).strict() ;

export const UserFindFirstArgsSchema: z.ZodType<Prisma.UserFindFirstArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UserFindFirstOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const UserAggregateArgsSchema: z.ZodType<Prisma.UserAggregateArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const UserGroupByArgsSchema: z.ZodType<Prisma.UserGroupByArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithAggregationInputSchema.array(),UserOrderByWithAggregationInputSchema ]).optional(),
  by: UserScalarFieldEnumSchema.array(),
  having: UserScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const UserFindUniqueArgsSchema: z.ZodType<Prisma.UserFindUniqueArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserFindUniqueOrThrowArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const ProfileFindFirstArgsSchema: z.ZodType<Prisma.ProfileFindFirstArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereInputSchema.optional(),
  orderBy: z.union([ ProfileOrderByWithRelationInputSchema.array(),ProfileOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileScalarFieldEnumSchema,ProfileScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ProfileFindFirstOrThrowArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereInputSchema.optional(),
  orderBy: z.union([ ProfileOrderByWithRelationInputSchema.array(),ProfileOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileScalarFieldEnumSchema,ProfileScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileFindManyArgsSchema: z.ZodType<Prisma.ProfileFindManyArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereInputSchema.optional(),
  orderBy: z.union([ ProfileOrderByWithRelationInputSchema.array(),ProfileOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileScalarFieldEnumSchema,ProfileScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileAggregateArgsSchema: z.ZodType<Prisma.ProfileAggregateArgs> = z.object({
  where: ProfileWhereInputSchema.optional(),
  orderBy: z.union([ ProfileOrderByWithRelationInputSchema.array(),ProfileOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ProfileGroupByArgsSchema: z.ZodType<Prisma.ProfileGroupByArgs> = z.object({
  where: ProfileWhereInputSchema.optional(),
  orderBy: z.union([ ProfileOrderByWithAggregationInputSchema.array(),ProfileOrderByWithAggregationInputSchema ]).optional(),
  by: ProfileScalarFieldEnumSchema.array(),
  having: ProfileScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ProfileFindUniqueArgsSchema: z.ZodType<Prisma.ProfileFindUniqueArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereUniqueInputSchema,
}).strict() ;

export const ProfileFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ProfileFindUniqueOrThrowArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereUniqueInputSchema,
}).strict() ;

export const DatingPreferencesFindFirstArgsSchema: z.ZodType<Prisma.DatingPreferencesFindFirstArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereInputSchema.optional(),
  orderBy: z.union([ DatingPreferencesOrderByWithRelationInputSchema.array(),DatingPreferencesOrderByWithRelationInputSchema ]).optional(),
  cursor: DatingPreferencesWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DatingPreferencesScalarFieldEnumSchema,DatingPreferencesScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DatingPreferencesFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DatingPreferencesFindFirstOrThrowArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereInputSchema.optional(),
  orderBy: z.union([ DatingPreferencesOrderByWithRelationInputSchema.array(),DatingPreferencesOrderByWithRelationInputSchema ]).optional(),
  cursor: DatingPreferencesWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DatingPreferencesScalarFieldEnumSchema,DatingPreferencesScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DatingPreferencesFindManyArgsSchema: z.ZodType<Prisma.DatingPreferencesFindManyArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereInputSchema.optional(),
  orderBy: z.union([ DatingPreferencesOrderByWithRelationInputSchema.array(),DatingPreferencesOrderByWithRelationInputSchema ]).optional(),
  cursor: DatingPreferencesWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ DatingPreferencesScalarFieldEnumSchema,DatingPreferencesScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const DatingPreferencesAggregateArgsSchema: z.ZodType<Prisma.DatingPreferencesAggregateArgs> = z.object({
  where: DatingPreferencesWhereInputSchema.optional(),
  orderBy: z.union([ DatingPreferencesOrderByWithRelationInputSchema.array(),DatingPreferencesOrderByWithRelationInputSchema ]).optional(),
  cursor: DatingPreferencesWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const DatingPreferencesGroupByArgsSchema: z.ZodType<Prisma.DatingPreferencesGroupByArgs> = z.object({
  where: DatingPreferencesWhereInputSchema.optional(),
  orderBy: z.union([ DatingPreferencesOrderByWithAggregationInputSchema.array(),DatingPreferencesOrderByWithAggregationInputSchema ]).optional(),
  by: DatingPreferencesScalarFieldEnumSchema.array(),
  having: DatingPreferencesScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const DatingPreferencesFindUniqueArgsSchema: z.ZodType<Prisma.DatingPreferencesFindUniqueArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereUniqueInputSchema,
}).strict() ;

export const DatingPreferencesFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DatingPreferencesFindUniqueOrThrowArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereUniqueInputSchema,
}).strict() ;

export const LocalizedProfileFieldFindFirstArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldFindFirstArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  orderBy: z.union([ LocalizedProfileFieldOrderByWithRelationInputSchema.array(),LocalizedProfileFieldOrderByWithRelationInputSchema ]).optional(),
  cursor: LocalizedProfileFieldWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ LocalizedProfileFieldScalarFieldEnumSchema,LocalizedProfileFieldScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const LocalizedProfileFieldFindFirstOrThrowArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldFindFirstOrThrowArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  orderBy: z.union([ LocalizedProfileFieldOrderByWithRelationInputSchema.array(),LocalizedProfileFieldOrderByWithRelationInputSchema ]).optional(),
  cursor: LocalizedProfileFieldWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ LocalizedProfileFieldScalarFieldEnumSchema,LocalizedProfileFieldScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const LocalizedProfileFieldFindManyArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldFindManyArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  orderBy: z.union([ LocalizedProfileFieldOrderByWithRelationInputSchema.array(),LocalizedProfileFieldOrderByWithRelationInputSchema ]).optional(),
  cursor: LocalizedProfileFieldWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ LocalizedProfileFieldScalarFieldEnumSchema,LocalizedProfileFieldScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const LocalizedProfileFieldAggregateArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldAggregateArgs> = z.object({
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  orderBy: z.union([ LocalizedProfileFieldOrderByWithRelationInputSchema.array(),LocalizedProfileFieldOrderByWithRelationInputSchema ]).optional(),
  cursor: LocalizedProfileFieldWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const LocalizedProfileFieldGroupByArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldGroupByArgs> = z.object({
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  orderBy: z.union([ LocalizedProfileFieldOrderByWithAggregationInputSchema.array(),LocalizedProfileFieldOrderByWithAggregationInputSchema ]).optional(),
  by: LocalizedProfileFieldScalarFieldEnumSchema.array(),
  having: LocalizedProfileFieldScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const LocalizedProfileFieldFindUniqueArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldFindUniqueArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereUniqueInputSchema,
}).strict() ;

export const LocalizedProfileFieldFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldFindUniqueOrThrowArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereUniqueInputSchema,
}).strict() ;

export const ProfileImageFindFirstArgsSchema: z.ZodType<Prisma.ProfileImageFindFirstArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereInputSchema.optional(),
  orderBy: z.union([ ProfileImageOrderByWithRelationInputSchema.array(),ProfileImageOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileImageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileImageScalarFieldEnumSchema,ProfileImageScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileImageFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ProfileImageFindFirstOrThrowArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereInputSchema.optional(),
  orderBy: z.union([ ProfileImageOrderByWithRelationInputSchema.array(),ProfileImageOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileImageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileImageScalarFieldEnumSchema,ProfileImageScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileImageFindManyArgsSchema: z.ZodType<Prisma.ProfileImageFindManyArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereInputSchema.optional(),
  orderBy: z.union([ ProfileImageOrderByWithRelationInputSchema.array(),ProfileImageOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileImageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ProfileImageScalarFieldEnumSchema,ProfileImageScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ProfileImageAggregateArgsSchema: z.ZodType<Prisma.ProfileImageAggregateArgs> = z.object({
  where: ProfileImageWhereInputSchema.optional(),
  orderBy: z.union([ ProfileImageOrderByWithRelationInputSchema.array(),ProfileImageOrderByWithRelationInputSchema ]).optional(),
  cursor: ProfileImageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ProfileImageGroupByArgsSchema: z.ZodType<Prisma.ProfileImageGroupByArgs> = z.object({
  where: ProfileImageWhereInputSchema.optional(),
  orderBy: z.union([ ProfileImageOrderByWithAggregationInputSchema.array(),ProfileImageOrderByWithAggregationInputSchema ]).optional(),
  by: ProfileImageScalarFieldEnumSchema.array(),
  having: ProfileImageScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ProfileImageFindUniqueArgsSchema: z.ZodType<Prisma.ProfileImageFindUniqueArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereUniqueInputSchema,
}).strict() ;

export const ProfileImageFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ProfileImageFindUniqueOrThrowArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereUniqueInputSchema,
}).strict() ;

export const ConversationFindFirstArgsSchema: z.ZodType<Prisma.ConversationFindFirstArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereInputSchema.optional(),
  orderBy: z.union([ ConversationOrderByWithRelationInputSchema.array(),ConversationOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConversationScalarFieldEnumSchema,ConversationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConversationFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ConversationFindFirstOrThrowArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereInputSchema.optional(),
  orderBy: z.union([ ConversationOrderByWithRelationInputSchema.array(),ConversationOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConversationScalarFieldEnumSchema,ConversationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConversationFindManyArgsSchema: z.ZodType<Prisma.ConversationFindManyArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereInputSchema.optional(),
  orderBy: z.union([ ConversationOrderByWithRelationInputSchema.array(),ConversationOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConversationScalarFieldEnumSchema,ConversationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConversationAggregateArgsSchema: z.ZodType<Prisma.ConversationAggregateArgs> = z.object({
  where: ConversationWhereInputSchema.optional(),
  orderBy: z.union([ ConversationOrderByWithRelationInputSchema.array(),ConversationOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ConversationGroupByArgsSchema: z.ZodType<Prisma.ConversationGroupByArgs> = z.object({
  where: ConversationWhereInputSchema.optional(),
  orderBy: z.union([ ConversationOrderByWithAggregationInputSchema.array(),ConversationOrderByWithAggregationInputSchema ]).optional(),
  by: ConversationScalarFieldEnumSchema.array(),
  having: ConversationScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ConversationFindUniqueArgsSchema: z.ZodType<Prisma.ConversationFindUniqueArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereUniqueInputSchema,
}).strict() ;

export const ConversationFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ConversationFindUniqueOrThrowArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereUniqueInputSchema,
}).strict() ;

export const ConversationParticipantFindFirstArgsSchema: z.ZodType<Prisma.ConversationParticipantFindFirstArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereInputSchema.optional(),
  orderBy: z.union([ ConversationParticipantOrderByWithRelationInputSchema.array(),ConversationParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationParticipantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConversationParticipantScalarFieldEnumSchema,ConversationParticipantScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConversationParticipantFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ConversationParticipantFindFirstOrThrowArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereInputSchema.optional(),
  orderBy: z.union([ ConversationParticipantOrderByWithRelationInputSchema.array(),ConversationParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationParticipantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConversationParticipantScalarFieldEnumSchema,ConversationParticipantScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConversationParticipantFindManyArgsSchema: z.ZodType<Prisma.ConversationParticipantFindManyArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereInputSchema.optional(),
  orderBy: z.union([ ConversationParticipantOrderByWithRelationInputSchema.array(),ConversationParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationParticipantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ConversationParticipantScalarFieldEnumSchema,ConversationParticipantScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const ConversationParticipantAggregateArgsSchema: z.ZodType<Prisma.ConversationParticipantAggregateArgs> = z.object({
  where: ConversationParticipantWhereInputSchema.optional(),
  orderBy: z.union([ ConversationParticipantOrderByWithRelationInputSchema.array(),ConversationParticipantOrderByWithRelationInputSchema ]).optional(),
  cursor: ConversationParticipantWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ConversationParticipantGroupByArgsSchema: z.ZodType<Prisma.ConversationParticipantGroupByArgs> = z.object({
  where: ConversationParticipantWhereInputSchema.optional(),
  orderBy: z.union([ ConversationParticipantOrderByWithAggregationInputSchema.array(),ConversationParticipantOrderByWithAggregationInputSchema ]).optional(),
  by: ConversationParticipantScalarFieldEnumSchema.array(),
  having: ConversationParticipantScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const ConversationParticipantFindUniqueArgsSchema: z.ZodType<Prisma.ConversationParticipantFindUniqueArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereUniqueInputSchema,
}).strict() ;

export const ConversationParticipantFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ConversationParticipantFindUniqueOrThrowArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereUniqueInputSchema,
}).strict() ;

export const MessageFindFirstArgsSchema: z.ZodType<Prisma.MessageFindFirstArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereInputSchema.optional(),
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(),MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MessageScalarFieldEnumSchema,MessageScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MessageFindFirstOrThrowArgsSchema: z.ZodType<Prisma.MessageFindFirstOrThrowArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereInputSchema.optional(),
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(),MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MessageScalarFieldEnumSchema,MessageScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MessageFindManyArgsSchema: z.ZodType<Prisma.MessageFindManyArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereInputSchema.optional(),
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(),MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ MessageScalarFieldEnumSchema,MessageScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const MessageAggregateArgsSchema: z.ZodType<Prisma.MessageAggregateArgs> = z.object({
  where: MessageWhereInputSchema.optional(),
  orderBy: z.union([ MessageOrderByWithRelationInputSchema.array(),MessageOrderByWithRelationInputSchema ]).optional(),
  cursor: MessageWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MessageGroupByArgsSchema: z.ZodType<Prisma.MessageGroupByArgs> = z.object({
  where: MessageWhereInputSchema.optional(),
  orderBy: z.union([ MessageOrderByWithAggregationInputSchema.array(),MessageOrderByWithAggregationInputSchema ]).optional(),
  by: MessageScalarFieldEnumSchema.array(),
  having: MessageScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const MessageFindUniqueArgsSchema: z.ZodType<Prisma.MessageFindUniqueArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema,
}).strict() ;

export const MessageFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.MessageFindUniqueOrThrowArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema,
}).strict() ;

export const PushSubscriptionFindFirstArgsSchema: z.ZodType<Prisma.PushSubscriptionFindFirstArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereInputSchema.optional(),
  orderBy: z.union([ PushSubscriptionOrderByWithRelationInputSchema.array(),PushSubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: PushSubscriptionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PushSubscriptionScalarFieldEnumSchema,PushSubscriptionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const PushSubscriptionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.PushSubscriptionFindFirstOrThrowArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereInputSchema.optional(),
  orderBy: z.union([ PushSubscriptionOrderByWithRelationInputSchema.array(),PushSubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: PushSubscriptionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PushSubscriptionScalarFieldEnumSchema,PushSubscriptionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const PushSubscriptionFindManyArgsSchema: z.ZodType<Prisma.PushSubscriptionFindManyArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereInputSchema.optional(),
  orderBy: z.union([ PushSubscriptionOrderByWithRelationInputSchema.array(),PushSubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: PushSubscriptionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PushSubscriptionScalarFieldEnumSchema,PushSubscriptionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export const PushSubscriptionAggregateArgsSchema: z.ZodType<Prisma.PushSubscriptionAggregateArgs> = z.object({
  where: PushSubscriptionWhereInputSchema.optional(),
  orderBy: z.union([ PushSubscriptionOrderByWithRelationInputSchema.array(),PushSubscriptionOrderByWithRelationInputSchema ]).optional(),
  cursor: PushSubscriptionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const PushSubscriptionGroupByArgsSchema: z.ZodType<Prisma.PushSubscriptionGroupByArgs> = z.object({
  where: PushSubscriptionWhereInputSchema.optional(),
  orderBy: z.union([ PushSubscriptionOrderByWithAggregationInputSchema.array(),PushSubscriptionOrderByWithAggregationInputSchema ]).optional(),
  by: PushSubscriptionScalarFieldEnumSchema.array(),
  having: PushSubscriptionScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export const PushSubscriptionFindUniqueArgsSchema: z.ZodType<Prisma.PushSubscriptionFindUniqueArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereUniqueInputSchema,
}).strict() ;

export const PushSubscriptionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.PushSubscriptionFindUniqueOrThrowArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereUniqueInputSchema,
}).strict() ;

export const CityCreateArgsSchema: z.ZodType<Prisma.CityCreateArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  data: z.union([ CityCreateInputSchema,CityUncheckedCreateInputSchema ]),
}).strict() ;

export const CityUpsertArgsSchema: z.ZodType<Prisma.CityUpsertArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereUniqueInputSchema,
  create: z.union([ CityCreateInputSchema,CityUncheckedCreateInputSchema ]),
  update: z.union([ CityUpdateInputSchema,CityUncheckedUpdateInputSchema ]),
}).strict() ;

export const CityCreateManyArgsSchema: z.ZodType<Prisma.CityCreateManyArgs> = z.object({
  data: z.union([ CityCreateManyInputSchema,CityCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const CityCreateManyAndReturnArgsSchema: z.ZodType<Prisma.CityCreateManyAndReturnArgs> = z.object({
  data: z.union([ CityCreateManyInputSchema,CityCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const CityDeleteArgsSchema: z.ZodType<Prisma.CityDeleteArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  where: CityWhereUniqueInputSchema,
}).strict() ;

export const CityUpdateArgsSchema: z.ZodType<Prisma.CityUpdateArgs> = z.object({
  select: CitySelectSchema.optional(),
  include: CityIncludeSchema.optional(),
  data: z.union([ CityUpdateInputSchema,CityUncheckedUpdateInputSchema ]),
  where: CityWhereUniqueInputSchema,
}).strict() ;

export const CityUpdateManyArgsSchema: z.ZodType<Prisma.CityUpdateManyArgs> = z.object({
  data: z.union([ CityUpdateManyMutationInputSchema,CityUncheckedUpdateManyInputSchema ]),
  where: CityWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CityUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.CityUpdateManyAndReturnArgs> = z.object({
  data: z.union([ CityUpdateManyMutationInputSchema,CityUncheckedUpdateManyInputSchema ]),
  where: CityWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const CityDeleteManyArgsSchema: z.ZodType<Prisma.CityDeleteManyArgs> = z.object({
  where: CityWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TagCreateArgsSchema: z.ZodType<Prisma.TagCreateArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  data: z.union([ TagCreateInputSchema,TagUncheckedCreateInputSchema ]),
}).strict() ;

export const TagUpsertArgsSchema: z.ZodType<Prisma.TagUpsertArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereUniqueInputSchema,
  create: z.union([ TagCreateInputSchema,TagUncheckedCreateInputSchema ]),
  update: z.union([ TagUpdateInputSchema,TagUncheckedUpdateInputSchema ]),
}).strict() ;

export const TagCreateManyArgsSchema: z.ZodType<Prisma.TagCreateManyArgs> = z.object({
  data: z.union([ TagCreateManyInputSchema,TagCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const TagCreateManyAndReturnArgsSchema: z.ZodType<Prisma.TagCreateManyAndReturnArgs> = z.object({
  data: z.union([ TagCreateManyInputSchema,TagCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const TagDeleteArgsSchema: z.ZodType<Prisma.TagDeleteArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  where: TagWhereUniqueInputSchema,
}).strict() ;

export const TagUpdateArgsSchema: z.ZodType<Prisma.TagUpdateArgs> = z.object({
  select: TagSelectSchema.optional(),
  include: TagIncludeSchema.optional(),
  data: z.union([ TagUpdateInputSchema,TagUncheckedUpdateInputSchema ]),
  where: TagWhereUniqueInputSchema,
}).strict() ;

export const TagUpdateManyArgsSchema: z.ZodType<Prisma.TagUpdateManyArgs> = z.object({
  data: z.union([ TagUpdateManyMutationInputSchema,TagUncheckedUpdateManyInputSchema ]),
  where: TagWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TagUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.TagUpdateManyAndReturnArgs> = z.object({
  data: z.union([ TagUpdateManyMutationInputSchema,TagUncheckedUpdateManyInputSchema ]),
  where: TagWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TagDeleteManyArgsSchema: z.ZodType<Prisma.TagDeleteManyArgs> = z.object({
  where: TagWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TagTranslationCreateArgsSchema: z.ZodType<Prisma.TagTranslationCreateArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  data: z.union([ TagTranslationCreateInputSchema,TagTranslationUncheckedCreateInputSchema ]),
}).strict() ;

export const TagTranslationUpsertArgsSchema: z.ZodType<Prisma.TagTranslationUpsertArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereUniqueInputSchema,
  create: z.union([ TagTranslationCreateInputSchema,TagTranslationUncheckedCreateInputSchema ]),
  update: z.union([ TagTranslationUpdateInputSchema,TagTranslationUncheckedUpdateInputSchema ]),
}).strict() ;

export const TagTranslationCreateManyArgsSchema: z.ZodType<Prisma.TagTranslationCreateManyArgs> = z.object({
  data: z.union([ TagTranslationCreateManyInputSchema,TagTranslationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const TagTranslationCreateManyAndReturnArgsSchema: z.ZodType<Prisma.TagTranslationCreateManyAndReturnArgs> = z.object({
  data: z.union([ TagTranslationCreateManyInputSchema,TagTranslationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const TagTranslationDeleteArgsSchema: z.ZodType<Prisma.TagTranslationDeleteArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  where: TagTranslationWhereUniqueInputSchema,
}).strict() ;

export const TagTranslationUpdateArgsSchema: z.ZodType<Prisma.TagTranslationUpdateArgs> = z.object({
  select: TagTranslationSelectSchema.optional(),
  include: TagTranslationIncludeSchema.optional(),
  data: z.union([ TagTranslationUpdateInputSchema,TagTranslationUncheckedUpdateInputSchema ]),
  where: TagTranslationWhereUniqueInputSchema,
}).strict() ;

export const TagTranslationUpdateManyArgsSchema: z.ZodType<Prisma.TagTranslationUpdateManyArgs> = z.object({
  data: z.union([ TagTranslationUpdateManyMutationInputSchema,TagTranslationUncheckedUpdateManyInputSchema ]),
  where: TagTranslationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TagTranslationUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.TagTranslationUpdateManyAndReturnArgs> = z.object({
  data: z.union([ TagTranslationUpdateManyMutationInputSchema,TagTranslationUncheckedUpdateManyInputSchema ]),
  where: TagTranslationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const TagTranslationDeleteManyArgsSchema: z.ZodType<Prisma.TagTranslationDeleteManyArgs> = z.object({
  where: TagTranslationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileTagCreateArgsSchema: z.ZodType<Prisma.ProfileTagCreateArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  data: z.union([ ProfileTagCreateInputSchema,ProfileTagUncheckedCreateInputSchema ]),
}).strict() ;

export const ProfileTagUpsertArgsSchema: z.ZodType<Prisma.ProfileTagUpsertArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereUniqueInputSchema,
  create: z.union([ ProfileTagCreateInputSchema,ProfileTagUncheckedCreateInputSchema ]),
  update: z.union([ ProfileTagUpdateInputSchema,ProfileTagUncheckedUpdateInputSchema ]),
}).strict() ;

export const ProfileTagCreateManyArgsSchema: z.ZodType<Prisma.ProfileTagCreateManyArgs> = z.object({
  data: z.union([ ProfileTagCreateManyInputSchema,ProfileTagCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ProfileTagCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ProfileTagCreateManyAndReturnArgs> = z.object({
  data: z.union([ ProfileTagCreateManyInputSchema,ProfileTagCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ProfileTagDeleteArgsSchema: z.ZodType<Prisma.ProfileTagDeleteArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  where: ProfileTagWhereUniqueInputSchema,
}).strict() ;

export const ProfileTagUpdateArgsSchema: z.ZodType<Prisma.ProfileTagUpdateArgs> = z.object({
  select: ProfileTagSelectSchema.optional(),
  include: ProfileTagIncludeSchema.optional(),
  data: z.union([ ProfileTagUpdateInputSchema,ProfileTagUncheckedUpdateInputSchema ]),
  where: ProfileTagWhereUniqueInputSchema,
}).strict() ;

export const ProfileTagUpdateManyArgsSchema: z.ZodType<Prisma.ProfileTagUpdateManyArgs> = z.object({
  data: z.union([ ProfileTagUpdateManyMutationInputSchema,ProfileTagUncheckedUpdateManyInputSchema ]),
  where: ProfileTagWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileTagUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ProfileTagUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ProfileTagUpdateManyMutationInputSchema,ProfileTagUncheckedUpdateManyInputSchema ]),
  where: ProfileTagWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileTagDeleteManyArgsSchema: z.ZodType<Prisma.ProfileTagDeleteManyArgs> = z.object({
  where: ProfileTagWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConnectionRequestCreateArgsSchema: z.ZodType<Prisma.ConnectionRequestCreateArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  data: z.union([ ConnectionRequestCreateInputSchema,ConnectionRequestUncheckedCreateInputSchema ]),
}).strict() ;

export const ConnectionRequestUpsertArgsSchema: z.ZodType<Prisma.ConnectionRequestUpsertArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereUniqueInputSchema,
  create: z.union([ ConnectionRequestCreateInputSchema,ConnectionRequestUncheckedCreateInputSchema ]),
  update: z.union([ ConnectionRequestUpdateInputSchema,ConnectionRequestUncheckedUpdateInputSchema ]),
}).strict() ;

export const ConnectionRequestCreateManyArgsSchema: z.ZodType<Prisma.ConnectionRequestCreateManyArgs> = z.object({
  data: z.union([ ConnectionRequestCreateManyInputSchema,ConnectionRequestCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ConnectionRequestCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ConnectionRequestCreateManyAndReturnArgs> = z.object({
  data: z.union([ ConnectionRequestCreateManyInputSchema,ConnectionRequestCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ConnectionRequestDeleteArgsSchema: z.ZodType<Prisma.ConnectionRequestDeleteArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  where: ConnectionRequestWhereUniqueInputSchema,
}).strict() ;

export const ConnectionRequestUpdateArgsSchema: z.ZodType<Prisma.ConnectionRequestUpdateArgs> = z.object({
  select: ConnectionRequestSelectSchema.optional(),
  include: ConnectionRequestIncludeSchema.optional(),
  data: z.union([ ConnectionRequestUpdateInputSchema,ConnectionRequestUncheckedUpdateInputSchema ]),
  where: ConnectionRequestWhereUniqueInputSchema,
}).strict() ;

export const ConnectionRequestUpdateManyArgsSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyArgs> = z.object({
  data: z.union([ ConnectionRequestUpdateManyMutationInputSchema,ConnectionRequestUncheckedUpdateManyInputSchema ]),
  where: ConnectionRequestWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConnectionRequestUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ConnectionRequestUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ConnectionRequestUpdateManyMutationInputSchema,ConnectionRequestUncheckedUpdateManyInputSchema ]),
  where: ConnectionRequestWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConnectionRequestDeleteManyArgsSchema: z.ZodType<Prisma.ConnectionRequestDeleteManyArgs> = z.object({
  where: ConnectionRequestWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const UserCreateArgsSchema: z.ZodType<Prisma.UserCreateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
}).strict() ;

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
  create: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
  update: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
}).strict() ;

export const UserCreateManyArgsSchema: z.ZodType<Prisma.UserCreateManyArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema,UserCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const UserCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserCreateManyInputSchema,UserCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const UserDeleteArgsSchema: z.ZodType<Prisma.UserDeleteArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserUpdateArgsSchema: z.ZodType<Prisma.UserUpdateArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: UserIncludeSchema.optional(),
  data: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
  where: UserWhereUniqueInputSchema,
}).strict() ;

export const UserUpdateManyArgsSchema: z.ZodType<Prisma.UserUpdateManyArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema,UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const UserUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserUpdateManyMutationInputSchema,UserUncheckedUpdateManyInputSchema ]),
  where: UserWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const UserDeleteManyArgsSchema: z.ZodType<Prisma.UserDeleteManyArgs> = z.object({
  where: UserWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileCreateArgsSchema: z.ZodType<Prisma.ProfileCreateArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  data: z.union([ ProfileCreateInputSchema,ProfileUncheckedCreateInputSchema ]),
}).strict() ;

export const ProfileUpsertArgsSchema: z.ZodType<Prisma.ProfileUpsertArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereUniqueInputSchema,
  create: z.union([ ProfileCreateInputSchema,ProfileUncheckedCreateInputSchema ]),
  update: z.union([ ProfileUpdateInputSchema,ProfileUncheckedUpdateInputSchema ]),
}).strict() ;

export const ProfileCreateManyArgsSchema: z.ZodType<Prisma.ProfileCreateManyArgs> = z.object({
  data: z.union([ ProfileCreateManyInputSchema,ProfileCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ProfileCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ProfileCreateManyAndReturnArgs> = z.object({
  data: z.union([ ProfileCreateManyInputSchema,ProfileCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ProfileDeleteArgsSchema: z.ZodType<Prisma.ProfileDeleteArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  where: ProfileWhereUniqueInputSchema,
}).strict() ;

export const ProfileUpdateArgsSchema: z.ZodType<Prisma.ProfileUpdateArgs> = z.object({
  select: ProfileSelectSchema.optional(),
  include: ProfileIncludeSchema.optional(),
  data: z.union([ ProfileUpdateInputSchema,ProfileUncheckedUpdateInputSchema ]),
  where: ProfileWhereUniqueInputSchema,
}).strict() ;

export const ProfileUpdateManyArgsSchema: z.ZodType<Prisma.ProfileUpdateManyArgs> = z.object({
  data: z.union([ ProfileUpdateManyMutationInputSchema,ProfileUncheckedUpdateManyInputSchema ]),
  where: ProfileWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ProfileUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ProfileUpdateManyMutationInputSchema,ProfileUncheckedUpdateManyInputSchema ]),
  where: ProfileWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileDeleteManyArgsSchema: z.ZodType<Prisma.ProfileDeleteManyArgs> = z.object({
  where: ProfileWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DatingPreferencesCreateArgsSchema: z.ZodType<Prisma.DatingPreferencesCreateArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  data: z.union([ DatingPreferencesCreateInputSchema,DatingPreferencesUncheckedCreateInputSchema ]),
}).strict() ;

export const DatingPreferencesUpsertArgsSchema: z.ZodType<Prisma.DatingPreferencesUpsertArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereUniqueInputSchema,
  create: z.union([ DatingPreferencesCreateInputSchema,DatingPreferencesUncheckedCreateInputSchema ]),
  update: z.union([ DatingPreferencesUpdateInputSchema,DatingPreferencesUncheckedUpdateInputSchema ]),
}).strict() ;

export const DatingPreferencesCreateManyArgsSchema: z.ZodType<Prisma.DatingPreferencesCreateManyArgs> = z.object({
  data: z.union([ DatingPreferencesCreateManyInputSchema,DatingPreferencesCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const DatingPreferencesCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DatingPreferencesCreateManyAndReturnArgs> = z.object({
  data: z.union([ DatingPreferencesCreateManyInputSchema,DatingPreferencesCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const DatingPreferencesDeleteArgsSchema: z.ZodType<Prisma.DatingPreferencesDeleteArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  where: DatingPreferencesWhereUniqueInputSchema,
}).strict() ;

export const DatingPreferencesUpdateArgsSchema: z.ZodType<Prisma.DatingPreferencesUpdateArgs> = z.object({
  select: DatingPreferencesSelectSchema.optional(),
  data: z.union([ DatingPreferencesUpdateInputSchema,DatingPreferencesUncheckedUpdateInputSchema ]),
  where: DatingPreferencesWhereUniqueInputSchema,
}).strict() ;

export const DatingPreferencesUpdateManyArgsSchema: z.ZodType<Prisma.DatingPreferencesUpdateManyArgs> = z.object({
  data: z.union([ DatingPreferencesUpdateManyMutationInputSchema,DatingPreferencesUncheckedUpdateManyInputSchema ]),
  where: DatingPreferencesWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DatingPreferencesUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.DatingPreferencesUpdateManyAndReturnArgs> = z.object({
  data: z.union([ DatingPreferencesUpdateManyMutationInputSchema,DatingPreferencesUncheckedUpdateManyInputSchema ]),
  where: DatingPreferencesWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const DatingPreferencesDeleteManyArgsSchema: z.ZodType<Prisma.DatingPreferencesDeleteManyArgs> = z.object({
  where: DatingPreferencesWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const LocalizedProfileFieldCreateArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  data: z.union([ LocalizedProfileFieldCreateInputSchema,LocalizedProfileFieldUncheckedCreateInputSchema ]),
}).strict() ;

export const LocalizedProfileFieldUpsertArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldUpsertArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereUniqueInputSchema,
  create: z.union([ LocalizedProfileFieldCreateInputSchema,LocalizedProfileFieldUncheckedCreateInputSchema ]),
  update: z.union([ LocalizedProfileFieldUpdateInputSchema,LocalizedProfileFieldUncheckedUpdateInputSchema ]),
}).strict() ;

export const LocalizedProfileFieldCreateManyArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateManyArgs> = z.object({
  data: z.union([ LocalizedProfileFieldCreateManyInputSchema,LocalizedProfileFieldCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const LocalizedProfileFieldCreateManyAndReturnArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldCreateManyAndReturnArgs> = z.object({
  data: z.union([ LocalizedProfileFieldCreateManyInputSchema,LocalizedProfileFieldCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const LocalizedProfileFieldDeleteArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldDeleteArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  where: LocalizedProfileFieldWhereUniqueInputSchema,
}).strict() ;

export const LocalizedProfileFieldUpdateArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateArgs> = z.object({
  select: LocalizedProfileFieldSelectSchema.optional(),
  include: LocalizedProfileFieldIncludeSchema.optional(),
  data: z.union([ LocalizedProfileFieldUpdateInputSchema,LocalizedProfileFieldUncheckedUpdateInputSchema ]),
  where: LocalizedProfileFieldWhereUniqueInputSchema,
}).strict() ;

export const LocalizedProfileFieldUpdateManyArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateManyArgs> = z.object({
  data: z.union([ LocalizedProfileFieldUpdateManyMutationInputSchema,LocalizedProfileFieldUncheckedUpdateManyInputSchema ]),
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const LocalizedProfileFieldUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldUpdateManyAndReturnArgs> = z.object({
  data: z.union([ LocalizedProfileFieldUpdateManyMutationInputSchema,LocalizedProfileFieldUncheckedUpdateManyInputSchema ]),
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const LocalizedProfileFieldDeleteManyArgsSchema: z.ZodType<Prisma.LocalizedProfileFieldDeleteManyArgs> = z.object({
  where: LocalizedProfileFieldWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileImageCreateArgsSchema: z.ZodType<Prisma.ProfileImageCreateArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  data: z.union([ ProfileImageCreateInputSchema,ProfileImageUncheckedCreateInputSchema ]),
}).strict() ;

export const ProfileImageUpsertArgsSchema: z.ZodType<Prisma.ProfileImageUpsertArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereUniqueInputSchema,
  create: z.union([ ProfileImageCreateInputSchema,ProfileImageUncheckedCreateInputSchema ]),
  update: z.union([ ProfileImageUpdateInputSchema,ProfileImageUncheckedUpdateInputSchema ]),
}).strict() ;

export const ProfileImageCreateManyArgsSchema: z.ZodType<Prisma.ProfileImageCreateManyArgs> = z.object({
  data: z.union([ ProfileImageCreateManyInputSchema,ProfileImageCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ProfileImageCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ProfileImageCreateManyAndReturnArgs> = z.object({
  data: z.union([ ProfileImageCreateManyInputSchema,ProfileImageCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ProfileImageDeleteArgsSchema: z.ZodType<Prisma.ProfileImageDeleteArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  where: ProfileImageWhereUniqueInputSchema,
}).strict() ;

export const ProfileImageUpdateArgsSchema: z.ZodType<Prisma.ProfileImageUpdateArgs> = z.object({
  select: ProfileImageSelectSchema.optional(),
  include: ProfileImageIncludeSchema.optional(),
  data: z.union([ ProfileImageUpdateInputSchema,ProfileImageUncheckedUpdateInputSchema ]),
  where: ProfileImageWhereUniqueInputSchema,
}).strict() ;

export const ProfileImageUpdateManyArgsSchema: z.ZodType<Prisma.ProfileImageUpdateManyArgs> = z.object({
  data: z.union([ ProfileImageUpdateManyMutationInputSchema,ProfileImageUncheckedUpdateManyInputSchema ]),
  where: ProfileImageWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileImageUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ProfileImageUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ProfileImageUpdateManyMutationInputSchema,ProfileImageUncheckedUpdateManyInputSchema ]),
  where: ProfileImageWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ProfileImageDeleteManyArgsSchema: z.ZodType<Prisma.ProfileImageDeleteManyArgs> = z.object({
  where: ProfileImageWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConversationCreateArgsSchema: z.ZodType<Prisma.ConversationCreateArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  data: z.union([ ConversationCreateInputSchema,ConversationUncheckedCreateInputSchema ]),
}).strict() ;

export const ConversationUpsertArgsSchema: z.ZodType<Prisma.ConversationUpsertArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereUniqueInputSchema,
  create: z.union([ ConversationCreateInputSchema,ConversationUncheckedCreateInputSchema ]),
  update: z.union([ ConversationUpdateInputSchema,ConversationUncheckedUpdateInputSchema ]),
}).strict() ;

export const ConversationCreateManyArgsSchema: z.ZodType<Prisma.ConversationCreateManyArgs> = z.object({
  data: z.union([ ConversationCreateManyInputSchema,ConversationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ConversationCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ConversationCreateManyAndReturnArgs> = z.object({
  data: z.union([ ConversationCreateManyInputSchema,ConversationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ConversationDeleteArgsSchema: z.ZodType<Prisma.ConversationDeleteArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  where: ConversationWhereUniqueInputSchema,
}).strict() ;

export const ConversationUpdateArgsSchema: z.ZodType<Prisma.ConversationUpdateArgs> = z.object({
  select: ConversationSelectSchema.optional(),
  include: ConversationIncludeSchema.optional(),
  data: z.union([ ConversationUpdateInputSchema,ConversationUncheckedUpdateInputSchema ]),
  where: ConversationWhereUniqueInputSchema,
}).strict() ;

export const ConversationUpdateManyArgsSchema: z.ZodType<Prisma.ConversationUpdateManyArgs> = z.object({
  data: z.union([ ConversationUpdateManyMutationInputSchema,ConversationUncheckedUpdateManyInputSchema ]),
  where: ConversationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConversationUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ConversationUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ConversationUpdateManyMutationInputSchema,ConversationUncheckedUpdateManyInputSchema ]),
  where: ConversationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConversationDeleteManyArgsSchema: z.ZodType<Prisma.ConversationDeleteManyArgs> = z.object({
  where: ConversationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConversationParticipantCreateArgsSchema: z.ZodType<Prisma.ConversationParticipantCreateArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  data: z.union([ ConversationParticipantCreateInputSchema,ConversationParticipantUncheckedCreateInputSchema ]),
}).strict() ;

export const ConversationParticipantUpsertArgsSchema: z.ZodType<Prisma.ConversationParticipantUpsertArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereUniqueInputSchema,
  create: z.union([ ConversationParticipantCreateInputSchema,ConversationParticipantUncheckedCreateInputSchema ]),
  update: z.union([ ConversationParticipantUpdateInputSchema,ConversationParticipantUncheckedUpdateInputSchema ]),
}).strict() ;

export const ConversationParticipantCreateManyArgsSchema: z.ZodType<Prisma.ConversationParticipantCreateManyArgs> = z.object({
  data: z.union([ ConversationParticipantCreateManyInputSchema,ConversationParticipantCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ConversationParticipantCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ConversationParticipantCreateManyAndReturnArgs> = z.object({
  data: z.union([ ConversationParticipantCreateManyInputSchema,ConversationParticipantCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const ConversationParticipantDeleteArgsSchema: z.ZodType<Prisma.ConversationParticipantDeleteArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  where: ConversationParticipantWhereUniqueInputSchema,
}).strict() ;

export const ConversationParticipantUpdateArgsSchema: z.ZodType<Prisma.ConversationParticipantUpdateArgs> = z.object({
  select: ConversationParticipantSelectSchema.optional(),
  include: ConversationParticipantIncludeSchema.optional(),
  data: z.union([ ConversationParticipantUpdateInputSchema,ConversationParticipantUncheckedUpdateInputSchema ]),
  where: ConversationParticipantWhereUniqueInputSchema,
}).strict() ;

export const ConversationParticipantUpdateManyArgsSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyArgs> = z.object({
  data: z.union([ ConversationParticipantUpdateManyMutationInputSchema,ConversationParticipantUncheckedUpdateManyInputSchema ]),
  where: ConversationParticipantWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConversationParticipantUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ConversationParticipantUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ConversationParticipantUpdateManyMutationInputSchema,ConversationParticipantUncheckedUpdateManyInputSchema ]),
  where: ConversationParticipantWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const ConversationParticipantDeleteManyArgsSchema: z.ZodType<Prisma.ConversationParticipantDeleteManyArgs> = z.object({
  where: ConversationParticipantWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const MessageCreateArgsSchema: z.ZodType<Prisma.MessageCreateArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  data: z.union([ MessageCreateInputSchema,MessageUncheckedCreateInputSchema ]),
}).strict() ;

export const MessageUpsertArgsSchema: z.ZodType<Prisma.MessageUpsertArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema,
  create: z.union([ MessageCreateInputSchema,MessageUncheckedCreateInputSchema ]),
  update: z.union([ MessageUpdateInputSchema,MessageUncheckedUpdateInputSchema ]),
}).strict() ;

export const MessageCreateManyArgsSchema: z.ZodType<Prisma.MessageCreateManyArgs> = z.object({
  data: z.union([ MessageCreateManyInputSchema,MessageCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MessageCreateManyAndReturnArgsSchema: z.ZodType<Prisma.MessageCreateManyAndReturnArgs> = z.object({
  data: z.union([ MessageCreateManyInputSchema,MessageCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const MessageDeleteArgsSchema: z.ZodType<Prisma.MessageDeleteArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  where: MessageWhereUniqueInputSchema,
}).strict() ;

export const MessageUpdateArgsSchema: z.ZodType<Prisma.MessageUpdateArgs> = z.object({
  select: MessageSelectSchema.optional(),
  include: MessageIncludeSchema.optional(),
  data: z.union([ MessageUpdateInputSchema,MessageUncheckedUpdateInputSchema ]),
  where: MessageWhereUniqueInputSchema,
}).strict() ;

export const MessageUpdateManyArgsSchema: z.ZodType<Prisma.MessageUpdateManyArgs> = z.object({
  data: z.union([ MessageUpdateManyMutationInputSchema,MessageUncheckedUpdateManyInputSchema ]),
  where: MessageWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const MessageUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.MessageUpdateManyAndReturnArgs> = z.object({
  data: z.union([ MessageUpdateManyMutationInputSchema,MessageUncheckedUpdateManyInputSchema ]),
  where: MessageWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const MessageDeleteManyArgsSchema: z.ZodType<Prisma.MessageDeleteManyArgs> = z.object({
  where: MessageWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const PushSubscriptionCreateArgsSchema: z.ZodType<Prisma.PushSubscriptionCreateArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  data: z.union([ PushSubscriptionCreateInputSchema,PushSubscriptionUncheckedCreateInputSchema ]),
}).strict() ;

export const PushSubscriptionUpsertArgsSchema: z.ZodType<Prisma.PushSubscriptionUpsertArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereUniqueInputSchema,
  create: z.union([ PushSubscriptionCreateInputSchema,PushSubscriptionUncheckedCreateInputSchema ]),
  update: z.union([ PushSubscriptionUpdateInputSchema,PushSubscriptionUncheckedUpdateInputSchema ]),
}).strict() ;

export const PushSubscriptionCreateManyArgsSchema: z.ZodType<Prisma.PushSubscriptionCreateManyArgs> = z.object({
  data: z.union([ PushSubscriptionCreateManyInputSchema,PushSubscriptionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const PushSubscriptionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.PushSubscriptionCreateManyAndReturnArgs> = z.object({
  data: z.union([ PushSubscriptionCreateManyInputSchema,PushSubscriptionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export const PushSubscriptionDeleteArgsSchema: z.ZodType<Prisma.PushSubscriptionDeleteArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  where: PushSubscriptionWhereUniqueInputSchema,
}).strict() ;

export const PushSubscriptionUpdateArgsSchema: z.ZodType<Prisma.PushSubscriptionUpdateArgs> = z.object({
  select: PushSubscriptionSelectSchema.optional(),
  include: PushSubscriptionIncludeSchema.optional(),
  data: z.union([ PushSubscriptionUpdateInputSchema,PushSubscriptionUncheckedUpdateInputSchema ]),
  where: PushSubscriptionWhereUniqueInputSchema,
}).strict() ;

export const PushSubscriptionUpdateManyArgsSchema: z.ZodType<Prisma.PushSubscriptionUpdateManyArgs> = z.object({
  data: z.union([ PushSubscriptionUpdateManyMutationInputSchema,PushSubscriptionUncheckedUpdateManyInputSchema ]),
  where: PushSubscriptionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const PushSubscriptionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.PushSubscriptionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ PushSubscriptionUpdateManyMutationInputSchema,PushSubscriptionUncheckedUpdateManyInputSchema ]),
  where: PushSubscriptionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export const PushSubscriptionDeleteManyArgsSchema: z.ZodType<Prisma.PushSubscriptionDeleteManyArgs> = z.object({
  where: PushSubscriptionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;