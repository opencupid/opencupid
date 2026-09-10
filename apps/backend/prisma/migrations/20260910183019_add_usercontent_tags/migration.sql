-- Implicit many-to-many join between UserContent and Tag (relation "UserContentTags").

-- CreateTable
CREATE TABLE "_UserContentTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserContentTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserContentTags_B_index" ON "_UserContentTags"("B");

-- AddForeignKey
ALTER TABLE "_UserContentTags" ADD CONSTRAINT "_UserContentTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserContentTags" ADD CONSTRAINT "_UserContentTags_B_fkey" FOREIGN KEY ("B") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
