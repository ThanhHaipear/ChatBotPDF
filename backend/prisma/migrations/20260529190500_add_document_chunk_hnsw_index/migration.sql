CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw_idx
ON "DocumentChunk"
USING hnsw (embedding vector_cosine_ops);
