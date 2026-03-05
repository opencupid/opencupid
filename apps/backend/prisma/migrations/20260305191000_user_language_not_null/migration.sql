-- Issue #943: enforce non-null language on User records
ALTER TABLE "User"
ALTER COLUMN "language" SET NOT NULL;

