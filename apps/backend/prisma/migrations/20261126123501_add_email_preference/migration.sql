-- CreateEnum
CREATE TYPE "EmailScope" AS ENUM ('notifications', 'reminders', 'newsletter');

-- CreateEnum
CREATE TYPE "EmailPreferenceSource" AS ENUM ('default', 'settings', 'unsubscribe_link', 'data_migration');

-- CreateTable
CREATE TABLE "EmailPreference" (
    "userId" TEXT NOT NULL,
    "scope" "EmailScope" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" "EmailPreferenceSource" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("userId","scope")
);

-- CreateIndex
CREATE INDEX "EmailPreference_scope_granted_idx" ON "EmailPreference"("scope", "granted");

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
