-- CreateEnum
CREATE TYPE "MessageTemplateType" AS ENUM ('welcome');

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

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_type_locale_key" ON "MessageTemplate"("type", "locale");

-- Seed welcome message templates from previous i18n strings.
-- ON CONFLICT keeps the migration idempotent and preserves any locally edited content.
INSERT INTO "MessageTemplate" ("id", "type", "locale", "content", "createdAt", "updatedAt") VALUES
  (
    'mtwelcome000000000000en',
    'welcome',
    'en',
    E'Welcome to {siteName}!\nI am Mookie, your host.\nThis is a place for us to connect, meet new people, and find like-minded souls. I hope you enjoy your stay here.\nHappy connecting!\n- Mookie',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'mtwelcome000000000000hu',
    'welcome',
    'hu',
    E'Üdv a {siteName} oldalon !\nMookie vagyok, a házigazda.\nEz egy olyan hely, ahol kapcsolatba léphetünk, új emberekkel találkozhatunk, és megtalálhatjuk a hasonlóan gondolkodó lelkeket. Remélem, jól fogod érezni magad itt.\nSzép kapcsolódásokat!\n\n- Mookie',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("type", "locale") DO NOTHING;
