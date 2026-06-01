-- Trigram index on UserContent.content for the /search endpoint.
--
-- Restores the equivalent of the original Post_content_trgm_idx that was
-- dropped together with the Post table during the UserContent polymorphism
-- refactor. Lives in its own migration so existing installations (whose
-- trgm migration is marked applied via reconcile_migration_history.sql)
-- still pick it up via `prisma migrate deploy`.

CREATE INDEX "UserContent_content_trgm_idx"
  ON "UserContent"
  USING GIN ("content" gin_trgm_ops);
