-- CreateTable
CREATE TABLE "MessageImage" (
    "imageId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,

    CONSTRAINT "MessageImage_pkey" PRIMARY KEY ("imageId")
);

-- CreateIndex
CREATE INDEX "MessageImage_messageId_idx" ON "MessageImage"("messageId");

-- AddForeignKey
ALTER TABLE "MessageImage" ADD CONSTRAINT "MessageImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageImage" ADD CONSTRAINT "MessageImage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
