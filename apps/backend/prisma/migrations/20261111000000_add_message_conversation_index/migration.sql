-- Latest-message-per-conversation lookups (inbox list, unread flag) and message
-- paging all filter by conversation and order by createdAt.
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
