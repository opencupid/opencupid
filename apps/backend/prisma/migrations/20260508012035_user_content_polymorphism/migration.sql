-- CreateEnum
CREATE TYPE "public"."ContentKind" AS ENUM ('post', 'event');

-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_postedById_fkey";

-- DropTable
DROP TABLE "public"."Post";

-- CreateTable
CREATE TABLE "public"."UserContent" (
    "id" TEXT NOT NULL,
    "kind" "public"."ContentKind" NOT NULL,
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
CREATE TABLE "public"."PostContent" (
    "userContentId" TEXT NOT NULL,
    "type" "public"."PostType" NOT NULL,

    CONSTRAINT "PostContent_pkey" PRIMARY KEY ("userContentId")
);

-- CreateTable
CREATE TABLE "public"."EventContent" (
    "userContentId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,

    CONSTRAINT "EventContent_pkey" PRIMARY KEY ("userContentId")
);

-- CreateIndex
CREATE INDEX "UserContent_postedById_idx" ON "public"."UserContent"("postedById");

-- CreateIndex
CREATE INDEX "UserContent_kind_idx" ON "public"."UserContent"("kind");

-- CreateIndex
CREATE INDEX "UserContent_createdAt_idx" ON "public"."UserContent"("createdAt");

-- CreateIndex
CREATE INDEX "UserContent_kind_isVisible_isDeleted_idx" ON "public"."UserContent"("kind", "isVisible", "isDeleted");

-- CreateIndex
CREATE INDEX "UserContent_lat_lon_idx" ON "public"."UserContent"("lat", "lon");

-- CreateIndex
CREATE INDEX "EventContent_startsAt_idx" ON "public"."EventContent"("startsAt");

-- AddForeignKey
ALTER TABLE "public"."UserContent" ADD CONSTRAINT "UserContent_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostContent" ADD CONSTRAINT "PostContent_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "public"."UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventContent" ADD CONSTRAINT "EventContent_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "public"."UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
