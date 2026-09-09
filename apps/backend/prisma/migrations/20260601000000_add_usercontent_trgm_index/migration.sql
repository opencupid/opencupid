-- Trigram index on UserContent.content for the /search endpoint.

CREATE INDEX "UserContent_content_trgm_idx"
  ON "UserContent"
  USING GIN ("content" gin_trgm_ops);
