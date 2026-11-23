-- Set when the sender edits a message; null for messages never edited.
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
