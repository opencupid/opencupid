-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'agender', 'androgynous', 'bigender', 'cis_man', 'cis_woman', 'genderfluid', 'genderqueer', 'gender_nonconforming', 'hijra', 'intersex', 'pangender', 'transfeminine', 'trans_man', 'transmasculine', 'transsexual', 'trans_woman', 'two_spirit', 'non_binary', 'other', 'unspecified');

-- CreateEnum
CREATE TYPE "Pronouns" AS ENUM ('he_him', 'she_her', 'they_them', 'unspecified');

-- CreateEnum
CREATE TYPE "HasKids" AS ENUM ('yes', 'no', 'unspecified');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('single', 'in_relationship', 'married', 'divorced', 'widowed', 'other', 'unspecified');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'user_dating', 'admin', 'moderator');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('OFFER', 'REQUEST');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('post', 'event', 'community');

-- CreateEnum
CREATE TYPE "ActivitySegment" AS ENUM ('new', 'returning', 'frequent', 'dormant');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('INITIATED', 'ACCEPTED', 'BLOCKED', 'ARCHIVED', 'PENDING', 'DISCARDED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('GOING', 'MAYBE');

-- CreateEnum
CREATE TYPE "TrustReason" AS ENUM ('PROFILE_UNVETTED', 'SPAM_BURST');

-- CreateEnum
CREATE TYPE "MessageTemplateType" AS ENUM ('welcome');

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalLocale" TEXT NOT NULL DEFAULT 'en',
    "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagTranslation" (
    "id" SERIAL NOT NULL,
    "tagId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phonenumber" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "loginToken" TEXT,
    "loginTokenExp" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isRegistrationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'en',
    "originDomain" TEXT NOT NULL,
    "newsletterOptIn" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsOptIn" BOOLEAN NOT NULL DEFAULT true,
    "roles" "UserRole"[] DEFAULT ARRAY['user']::"UserRole"[],
    "isPushNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "cityName" TEXT NOT NULL DEFAULT '',
    "isSocialActive" BOOLEAN NOT NULL DEFAULT false,
    "isDatingActive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "isCallable" BOOLEAN NOT NULL DEFAULT true,
    "hasFace" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "work" TEXT NOT NULL DEFAULT '',
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "birthday" TIMESTAMP(3),
    "gender" "Gender",
    "pronouns" "Pronouns",
    "relationship" "RelationshipStatus",
    "hasKids" "HasKids",
    "prefAgeMin" INTEGER,
    "prefAgeMax" INTEGER,
    "prefGender" "Gender"[] DEFAULT ARRAY[]::"Gender"[],
    "prefKids" "HasKids"[] DEFAULT ARRAY[]::"HasKids"[],
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalizedProfileField" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "LocalizedProfileField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "contentHash" TEXT,
    "blurhash" TEXT,
    "hasFace" BOOLEAN NOT NULL DEFAULT false,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileImage" (
    "imageId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("imageId")
);

-- CreateTable
CREATE TABLE "UserContentImage" (
    "imageId" TEXT NOT NULL,
    "userContentId" TEXT NOT NULL,

    CONSTRAINT "UserContentImage_pkey" PRIMARY KEY ("imageId")
);

-- CreateTable
CREATE TABLE "MessageImage" (
    "imageId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "MessageImage_pkey" PRIMARY KEY ("imageId")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileAId" TEXT NOT NULL,
    "profileBId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatorProfileId" TEXT NOT NULL,
    "jitsiRoomId" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isCallable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikedProfile" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LikedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiddenProfile" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text/plain',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceInfo" TEXT,
    "lastSeen" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContent" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "postedById" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT,
    "cityName" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostContent" (
    "userContentId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,

    CONSTRAINT "PostContent_pkey" PRIMARY KEY ("userContentId")
);

-- CreateTable
CREATE TABLE "EventContent" (
    "userContentId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,

    CONSTRAINT "EventContent_pkey" PRIMARY KEY ("userContentId")
);

-- CreateTable
CREATE TABLE "EventAttendance" (
    "eventContentId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'GOING',
    "rsvpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("eventContentId","profileId")
);

-- CreateTable
CREATE TABLE "CommunityContent" (
    "userContentId" TEXT NOT NULL,
    "yearFounded" INTEGER,

    CONSTRAINT "CommunityContent_pkey" PRIMARY KEY ("userContentId")
);

-- CreateTable
CREATE TABLE "ProfileSessionLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileActivitySummary" (
    "profileId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "activeDays28" INTEGER NOT NULL DEFAULT 0,
    "sessions28" INTEGER NOT NULL DEFAULT 0,
    "segment" "ActivitySegment" NOT NULL DEFAULT 'dormant',
    "demotionStreak" INTEGER NOT NULL DEFAULT 0,
    "segmentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileActivitySummary_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "ProfileTrustFlag" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reason" "TrustReason" NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedBy" TEXT,
    "evidence" TEXT NOT NULL,
    "flaggedBy" TEXT NOT NULL,

    CONSTRAINT "ProfileTrustFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "type" "MessageTemplateType" NOT NULL,
    "locale" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfileTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfileTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BlockedProfiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlockedProfiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TagTranslation_tagId_locale_key" ON "TagTranslation"("tagId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phonenumber_key" ON "User"("phonenumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginToken_key" ON "User"("loginToken");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_lat_lon_idx" ON "Profile"("lat", "lon");

-- CreateIndex
CREATE UNIQUE INDEX "LocalizedProfileField_profileId_field_locale_key" ON "LocalizedProfileField"("profileId", "field", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Image_storagePath_key" ON "Image"("storagePath");

-- CreateIndex
CREATE INDEX "Image_ownerProfileId_idx" ON "Image"("ownerProfileId");

-- CreateIndex
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

-- CreateIndex
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");

-- CreateIndex
CREATE INDEX "MessageImage_messageId_idx" ON "MessageImage"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_profileId_conversationId_key" ON "ConversationParticipant"("profileId", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "LikedProfile_fromId_toId_key" ON "LikedProfile"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenProfile_fromId_toId_key" ON "HiddenProfile"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAttachment_messageId_key" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "UserContent_postedById_idx" ON "UserContent"("postedById");

-- CreateIndex
CREATE INDEX "UserContent_kind_idx" ON "UserContent"("kind");

-- CreateIndex
CREATE INDEX "UserContent_createdAt_idx" ON "UserContent"("createdAt");

-- CreateIndex
CREATE INDEX "UserContent_kind_isVisible_isDeleted_idx" ON "UserContent"("kind", "isVisible", "isDeleted");

-- CreateIndex
CREATE INDEX "UserContent_lat_lon_idx" ON "UserContent"("lat", "lon");

-- CreateIndex
CREATE INDEX "EventContent_startsAt_idx" ON "EventContent"("startsAt");

-- CreateIndex
CREATE INDEX "EventAttendance_profileId_status_idx" ON "EventAttendance"("profileId", "status");

-- CreateIndex
CREATE INDEX "EventAttendance_eventContentId_status_idx" ON "EventAttendance"("eventContentId", "status");

-- CreateIndex
CREATE INDEX "ProfileSessionLog_profileId_startedAt_idx" ON "ProfileSessionLog"("profileId", "startedAt");

-- CreateIndex
CREATE INDEX "ProfileTrustFlag_profileId_clearedAt_idx" ON "ProfileTrustFlag"("profileId", "clearedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_type_locale_key" ON "MessageTemplate"("type", "locale");

-- CreateIndex
CREATE INDEX "_ProfileTags_B_index" ON "_ProfileTags"("B");

-- CreateIndex
CREATE INDEX "_BlockedProfiles_B_index" ON "_BlockedProfiles"("B");

-- AddForeignKey
ALTER TABLE "TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalizedProfileField" ADD CONSTRAINT "LocalizedProfileField_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentImage" ADD CONSTRAINT "UserContentImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentImage" ADD CONSTRAINT "UserContentImage_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageImage" ADD CONSTRAINT "MessageImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageImage" ADD CONSTRAINT "MessageImage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_initiatorProfileId_fkey" FOREIGN KEY ("initiatorProfileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedProfile" ADD CONSTRAINT "LikedProfile_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedProfile" ADD CONSTRAINT "LikedProfile_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenProfile" ADD CONSTRAINT "HiddenProfile_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenProfile" ADD CONSTRAINT "HiddenProfile_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContent" ADD CONSTRAINT "UserContent_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostContent" ADD CONSTRAINT "PostContent_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventContent" ADD CONSTRAINT "EventContent_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventContentId_fkey" FOREIGN KEY ("eventContentId") REFERENCES "EventContent"("userContentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityContent" ADD CONSTRAINT "CommunityContent_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSessionLog" ADD CONSTRAINT "ProfileSessionLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileActivitySummary" ADD CONSTRAINT "ProfileActivitySummary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTrustFlag" ADD CONSTRAINT "ProfileTrustFlag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileTags" ADD CONSTRAINT "_ProfileTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileTags" ADD CONSTRAINT "_ProfileTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlockedProfiles" ADD CONSTRAINT "_BlockedProfiles_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlockedProfiles" ADD CONSTRAINT "_BlockedProfiles_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Partial unique index for active conversations (not representable in Prisma schema).
-- Excluding DISCARDED lets multiple terminal rows coexist per pair (so a soft-deleted
-- conversation doesn't block a fresh one), while still preventing duplicate active
-- conversations. Application-side lookups must filter by status != 'DISCARDED' to see
-- only live rows — enforced in MessageService.resolveConversation.
CREATE UNIQUE INDEX "Conversation_active_pair_key"
    ON "Conversation" ("profileAId", "profileBId")
    WHERE "status" != 'DISCARDED';

-- Partial index on active (uncleared) trust flags (not representable in Prisma schema).
CREATE INDEX "ProfileTrustFlag_active_idx"
    ON "ProfileTrustFlag" ("profileId")
    WHERE "clearedAt" IS NULL;
