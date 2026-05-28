-- Existing OpenAI 1536-dimensional vectors cannot be cast to the new
-- Hugging Face 1024-dimensional embedding size. Re-index documents after this.
TRUNCATE TABLE "DocumentChunk";

ALTER TABLE "DocumentChunk"
ALTER COLUMN "embedding" TYPE vector(1024);
