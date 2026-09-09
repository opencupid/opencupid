-- Implicit many-to-many join between UserContent and Tag (relation "UserContentTags").
-- Mirrors "_ProfileTags": composite PK on (A,B), an index on the second column, and
-- cascading FKs on both sides.
--
-- Column order follows Prisma's alphabetical rule for implicit relations, which puts
-- the TAG id in "A" and the USERCONTENT id in "B" — the opposite of "_ProfileTags",
-- where the tag id sits in "B". Any raw SQL touching this table must respect that.

CREATE TABLE "_UserContentTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserContentTags_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_UserContentTags_B_index" ON "_UserContentTags"("B");

ALTER TABLE "_UserContentTags" ADD CONSTRAINT "_UserContentTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_UserContentTags" ADD CONSTRAINT "_UserContentTags_B_fkey" FOREIGN KEY ("B") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
