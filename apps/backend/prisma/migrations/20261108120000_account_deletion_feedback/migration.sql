-- CreateEnum
CREATE TYPE "AccountDeletionReason" AS ENUM ('found_connection', 'not_a_good_fit', 'bad_experience', 'other');

-- CreateTable
CREATE TABLE "AccountDeletionFeedback" (
    "id" TEXT NOT NULL,
    "reason" "AccountDeletionReason" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionFeedback_pkey" PRIMARY KEY ("id")
);
