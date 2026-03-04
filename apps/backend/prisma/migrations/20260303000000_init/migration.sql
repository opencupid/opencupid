-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ConnectionType" AS ENUM ('friend', 'dating');

-- CreateEnum
CREATE TYPE "public"."ConnectionStatus" AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('male', 'female', 'agender', 'androgynous', 'bigender', 'cis_man', 'cis_woman', 'genderfluid', 'genderqueer', 'gender_nonconforming', 'hijra', 'intersex', 'pangender', 'transfeminine', 'trans_man', 'transmasculine', 'transsexual', 'trans_woman', 'two_spirit', 'non_binary', 'other', 'unspecified');

-- CreateEnum
CREATE TYPE "public"."Pronouns" AS ENUM ('he_him', 'she_her', 'they_them', 'unspecified');

-- CreateEnum
CREATE TYPE "public"."HasKids" AS ENUM ('yes', 'no', 'unspecified');

-- CreateEnum
CREATE TYPE "public"."RelationshipStatus" AS ENUM ('single', 'in_relationship', 'married', 'divorced', 'widowed', 'other', 'unspecified');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'user_dating', 'admin', 'moderator');

-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('OFFER', 'REQUEST');

-- CreateEnum
CREATE TYPE "public"."ActivitySegment" AS ENUM ('new', 'returning', 'frequent', 'dormant');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('INITIATED', 'ACCEPTED', 'BLOCKED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."Tag" (
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
CREATE TABLE "public"."TagTranslation" (
    "id" SERIAL NOT NULL,
    "tagId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConnectionRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "scope" "public"."ConnectionType" NOT NULL,
    "status" "public"."ConnectionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
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
    "language" TEXT DEFAULT 'en',
    "newsletterOptIn" BOOLEAN NOT NULL DEFAULT false,
    "roles" "public"."UserRole"[] DEFAULT ARRAY['user']::"public"."UserRole"[],
    "isPushNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
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
    "userId" TEXT NOT NULL,
    "work" TEXT NOT NULL DEFAULT '',
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "birthday" TIMESTAMP(3),
    "gender" "public"."Gender",
    "pronouns" "public"."Pronouns",
    "relationship" "public"."RelationshipStatus",
    "hasKids" "public"."HasKids",
    "prefAgeMin" INTEGER,
    "prefAgeMax" INTEGER,
    "prefGender" "public"."Gender"[] DEFAULT ARRAY[]::"public"."Gender"[],
    "prefKids" "public"."HasKids"[] DEFAULT ARRAY[]::"public"."HasKids"[],
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocalizedProfileField" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "LocalizedProfileField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT NOT NULL DEFAULT '',
    "storagePath" TEXT NOT NULL,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentHash" TEXT,
    "blurhash" TEXT,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileAId" TEXT NOT NULL,
    "profileBId" TEXT NOT NULL,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatorProfileId" TEXT NOT NULL,
    "jitsiRoomId" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationParticipant" (
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
CREATE TABLE "public"."LikedProfile" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isNew" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LikedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HiddenProfile" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text/plain',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageAttachment" (
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
CREATE TABLE "public"."SocialMatchFilter" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "country" TEXT,
    "cityName" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "radius" INTEGER DEFAULT 50,

    CONSTRAINT "SocialMatchFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushSubscription" (
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
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."PostType" NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "country" TEXT,
    "cityName" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "postedById" TEXT NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileSessionLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileActivitySummary" (
    "profileId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "activeDays28" INTEGER NOT NULL DEFAULT 0,
    "sessions28" INTEGER NOT NULL DEFAULT 0,
    "segment" "public"."ActivitySegment" NOT NULL DEFAULT 'dormant',
    "demotionStreak" INTEGER NOT NULL DEFAULT 0,
    "segmentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileActivitySummary_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "public"."_ProfileTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfileTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_BlockedProfiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlockedProfiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_SocialMatchFilterToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SocialMatchFilterToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "public"."Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TagTranslation_tagId_locale_key" ON "public"."TagTranslation"("tagId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_fromUserId_toUserId_scope_key" ON "public"."ConnectionRequest"("fromUserId", "toUserId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phonenumber_key" ON "public"."User"("phonenumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginToken_key" ON "public"."User"("loginToken");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalizedProfileField_profileId_field_locale_key" ON "public"."LocalizedProfileField"("profileId", "field", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileImage_storagePath_key" ON "public"."ProfileImage"("storagePath");

-- CreateIndex
CREATE INDEX "ProfileImage_userId_idx" ON "public"."ProfileImage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_profileAId_profileBId_key" ON "public"."Conversation"("profileAId", "profileBId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_profileId_conversationId_key" ON "public"."ConversationParticipant"("profileId", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "LikedProfile_fromId_toId_key" ON "public"."LikedProfile"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenProfile_fromId_toId_key" ON "public"."HiddenProfile"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAttachment_messageId_key" ON "public"."MessageAttachment"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMatchFilter_profileId_key" ON "public"."SocialMatchFilter"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "Post_postedById_idx" ON "public"."Post"("postedById");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "public"."Post"("type");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "public"."Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_isVisible_isDeleted_idx" ON "public"."Post"("isVisible", "isDeleted");

-- CreateIndex
CREATE INDEX "ProfileSessionLog_profileId_startedAt_idx" ON "public"."ProfileSessionLog"("profileId", "startedAt");

-- CreateIndex
CREATE INDEX "_ProfileTags_B_index" ON "public"."_ProfileTags"("B");

-- CreateIndex
CREATE INDEX "_BlockedProfiles_B_index" ON "public"."_BlockedProfiles"("B");

-- CreateIndex
CREATE INDEX "_SocialMatchFilterToTag_B_index" ON "public"."_SocialMatchFilterToTag"("B");

-- AddForeignKey
ALTER TABLE "public"."TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocalizedProfileField" ADD CONSTRAINT "LocalizedProfileField_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileImage" ADD CONSTRAINT "ProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileImage" ADD CONSTRAINT "ProfileImage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_initiatorProfileId_fkey" FOREIGN KEY ("initiatorProfileId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LikedProfile" ADD CONSTRAINT "LikedProfile_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LikedProfile" ADD CONSTRAINT "LikedProfile_toId_fkey" FOREIGN KEY ("toId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HiddenProfile" ADD CONSTRAINT "HiddenProfile_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HiddenProfile" ADD CONSTRAINT "HiddenProfile_toId_fkey" FOREIGN KEY ("toId") REFERENCES "public"."Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileSessionLog" ADD CONSTRAINT "ProfileSessionLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileActivitySummary" ADD CONSTRAINT "ProfileActivitySummary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProfileTags" ADD CONSTRAINT "_ProfileTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProfileTags" ADD CONSTRAINT "_ProfileTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlockedProfiles" ADD CONSTRAINT "_BlockedProfiles_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BlockedProfiles" ADD CONSTRAINT "_BlockedProfiles_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SocialMatchFilterToTag" ADD CONSTRAINT "_SocialMatchFilterToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."SocialMatchFilter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SocialMatchFilterToTag" ADD CONSTRAINT "_SocialMatchFilterToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

