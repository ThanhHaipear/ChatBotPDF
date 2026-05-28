# Plan to Complete the Chatbot with Hugging Face, LangChain, and Reranking

This document describes the current state of `project1` and the work needed to complete the StudyDocs AI chatbot with three key components:

- Hugging Face: use Hugging Face models for embeddings or LLM generation.
- LangChain: organize the RAG pipeline more clearly.
- Reranking: reorder retrieved results before passing them to the LLM.

## 1. Current State

The project already has a basic RAG chatbot.

Existing components:

- Backend: NestJS, TypeScript.
- Frontend: React, Vite.
- Database: PostgreSQL + pgvector.
- ORM: Prisma.
- PDF processing: `pdf-parse`.
- PDF upload with document metadata.
- Text extraction and chunking.
- Embedding generation with OpenAI `text-embedding-3-small`.
- Vector storage in the `DocumentChunk` table.
- Vector similarity search in PostgreSQL.
- Answer generation with OpenAI `gpt-4.1-mini`.

Important files:

- `backend/src/documents/documents.service.ts`: uploads PDFs, extracts text, creates embeddings, and stores chunks.
- `backend/src/chat/chat.service.ts`: creates the query embedding, performs vector search, builds context, and calls the LLM.
- `backend/src/openai/openai.service.ts`: calls OpenAI for embeddings and answer generation.
- `backend/prisma/schema.prisma`: defines `Document`, `DocumentChunk`, and the current vector dimension `1536`.

## 2. Missing Parts

| Requirement | Current status | Required work |
| --- | --- | --- |
| Hugging Face | Not implemented | Add a service for Hugging Face embeddings or LLMs |
| LangChain | Not implemented | Add a RAG service that uses LangChain for retriever, prompt, and chain management |
| Reranking | Not implemented | Add a reranking step after vector search |
| Vector database | Implemented | Keep PostgreSQL + pgvector |
| PDF ingestion | Implemented | Keep it and integrate the new embedding provider |
| Chat RAG | Implemented partially | Upgrade the pipeline to search -> rerank -> answer |

## 3. Target Architecture

Document ingestion pipeline:

```text
PDF upload
-> Extract text
-> Clean text
-> Chunk text
-> Hugging Face embeddings
-> Store chunks + vectors in PostgreSQL pgvector
```

Chat pipeline:

```text
User question
-> Create question embedding with Hugging Face
-> Vector search top 20 chunks
-> Rerank the top 20 chunks
-> Select the best top 5 chunks
-> LangChain prompt/context chain
-> Generate answer with an LLM
-> Return answer, recommended documents, and sources
```

## 4. Proposed Technical Choices

### 4.1 Hugging Face Embeddings

Choose a multilingual model that works well for Vietnamese:

| Model | Dimension | Notes |
| --- | ---: | --- |
| `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | 384 | Lightweight and suitable for demos |
| `intfloat/multilingual-e5-large` | 1024 | Better quality, heavier model |
| `BAAI/bge-m3` | 1024 | Strong multilingual retrieval model |

Recommended model for this project:

```text
BAAI/bge-m3
```

If a 1024-dimensional model is used, update the Prisma schema:

```prisma
embedding Unsupported("vector(1024)")
```

The current schema uses:

```prisma
embedding Unsupported("vector(1536)")
```

Changing the embedding model requires a new migration and re-indexing existing documents.

### 4.2 LangChain

Install the required packages:

```bash
cd backend
npm install langchain @langchain/core @langchain/community
```

The goal is not to rewrite the entire application. The goal is to move the RAG pipeline into a clearer service.

Proposed module:

```text
backend/src/rag/rag.module.ts
backend/src/rag/rag.service.ts
```

`RagService` should be responsible for:

- Creating the prompt from the user question and context.
- Formatting context from reranked chunks.
- Calling the LLM to generate the answer.
- Ensuring the answer is grounded in the provided context.

### 4.3 Reranking

Add a reranking step after vector search.

Proposed options:

| Option | Pros | Cons |
| --- | --- | --- |
| Hugging Face reranker API | Matches the Hugging Face requirement | Depends on API and model availability |
| Cohere Rerank API | Easy to integrate and high quality | Adds another external provider |
| Local Python reranker | More control and better for offline demos | Requires an additional Python/FastAPI service |

To keep the NestJS project simple, start by creating a `RerankService` interface first. The Hugging Face provider can be added inside that service afterward.

Proposed module:

```text
backend/src/rerank/rerank.module.ts
backend/src/rerank/rerank.service.ts
```

Expected logic:

```text
Input:
- query
- list of chunks returned by vector search

Output:
- chunks reordered by rerankScore
- only the top 5 chunks are used as context
```

## 5. Required Code Changes

### Step 1: Add New Environment Variables

Update `backend/.env.example`:

```env
HUGGINGFACE_API_KEY="YOUR_HUGGINGFACE_TOKEN"
HUGGINGFACE_EMBEDDING_MODEL="BAAI/bge-m3"
HUGGINGFACE_RERANK_MODEL="BAAI/bge-reranker-base"
RAG_VECTOR_TOP_K=20
RAG_RERANK_TOP_K=5
```

If OpenAI is still used for answer generation, keep:

```env
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```

### Step 2: Add a Hugging Face Module

Create:

```text
backend/src/huggingface/huggingface.module.ts
backend/src/huggingface/huggingface.service.ts
```

The service should provide:

```ts
createEmbedding(text: string): Promise<number[]>
```

After this service is added, replace calls to:

```ts
this.openAiService.createEmbedding(...)
```

with:

```ts
this.huggingFaceService.createEmbedding(...)
```

in:

- `backend/src/documents/documents.service.ts`
- `backend/src/chat/chat.service.ts`

### Step 3: Adjust Vector Dimension

If using `BAAI/bge-m3` or `multilingual-e5-large`, update:

```prisma
embedding Unsupported("vector(1024)")
```

Then create a migration:

```bash
cd backend
npx prisma migrate dev --name change_embedding_dimension
```

Important: changing vector dimension makes existing vectors invalid. Existing documents must be deleted and indexed again.

### Step 4: Add a Rerank Module

Create:

```text
backend/src/rerank/rerank.module.ts
backend/src/rerank/rerank.service.ts
```

Proposed types:

```ts
export type RerankInput = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
};

export type RerankOutput = RerankInput & {
  rerankScore: number;
};
```

Required method:

```ts
rerank(query: string, chunks: RerankInput[]): Promise<RerankOutput[]>
```

Initial fallback behavior:

- If no real reranker API is configured, keep the vector search order.
- When the Hugging Face reranker is ready, replace the internal logic.

### Step 5: Update `chat.service.ts`

Current flow:

```text
query embedding
-> vector search LIMIT 8
-> build context
-> generate answer
```

Target flow:

```text
query embedding
-> vector search LIMIT 20
-> rerank
-> select top 5
-> build context
-> LangChain/RAG service generates answer
```

The API response should include `rerankScore`:

```ts
sources: [
  {
    documentTitle,
    subject,
    topic,
    level,
    priceType,
    similarity,
    rerankScore,
    preview
  }
]
```

### Step 6: Add a LangChain RAG Module

Create:

```text
backend/src/rag/rag.module.ts
backend/src/rag/rag.service.ts
```

`RagService` should provide:

```ts
generateAnswer(question: string, context: string): Promise<string>
```

Internally, use a LangChain prompt template. Because the project already has OpenAI answer generation, the first implementation can:

- Keep OpenAI as the LLM.
- Use LangChain for prompt and chain management.
- Switch to a Hugging Face LLM later if needed.

### Step 7: Update README

Update the Tech Stack section:

```text
AI:
- Hugging Face embeddings
- LangChain RAG pipeline
- Reranking before answer generation
- OpenAI or Hugging Face LLM for answer generation
```

Update the Features section:

```text
- Generate embeddings with Hugging Face models
- Retrieve top-K chunks with pgvector
- Rerank retrieved chunks before answer generation
- Generate source-grounded answers through a LangChain RAG chain
```

## 6. Implementation Checklist

- [x] Choose the official Hugging Face embedding model for the project.
- [x] Update `backend/.env.example`.
- [x] Install the required Hugging Face and LangChain packages.
- [x] Create `HuggingFaceModule` and `HuggingFaceService`.
- [x] Switch document indexing to Hugging Face embeddings.
- [x] Switch chat query embedding to Hugging Face embeddings.
- [x] Update Prisma vector dimension if the new model is not 1536-dimensional.
- [x] Create a migration for the vector dimension change.
- [ ] Delete and re-index sample documents after changing embeddings. No sample PDF is committed in this repo; upload PDFs again after running the migration.
- [x] Create `RerankModule` and `RerankService`.
- [x] Change vector search from top 8 to top 20.
- [x] Add reranking and only use the top 5 chunks as context.
- [x] Create `RagModule` and `RagService` using LangChain.
- [x] Move prompt generation into `RagService`.
- [x] Update the `sources` response with `rerankScore`.
- [x] Update README.
- [ ] Test PDF upload manually with a real `HUGGINGFACE_API_KEY`.
- [x] Test chat with subject/topic/level/priceType filters at service level.
- [x] Test the case where no relevant document exists at service level.
- [x] Test frontend build for answer, recommendations, and sources UI.
- [ ] Test frontend rendering in a browser against a running backend.

## 7. Recommended Implementation Order

Implement in this order to reduce risk:

1. Add `.env.example` variables and packages.
2. Add `HuggingFaceService`.
3. Switch embeddings in document indexing and chat.
4. Update vector dimension and migration if needed.
5. Re-index documents.
6. Add `RerankService` with fallback ordering.
7. Update `ChatService` to top 20 -> rerank -> top 5.
8. Add LangChain `RagService`.
9. Update README and test end to end.

## 8. Completion Criteria

The project is considered complete for this requirement when:

- The codebase has a dedicated Hugging Face module.
- Document embeddings and question embeddings use a Hugging Face model.
- The codebase has a dedicated LangChain/RAG module.
- The chat pipeline has a clear reranking step.
- The chat API returns reranked sources.
- README accurately describes Hugging Face, LangChain, and reranking.
- Users can upload a PDF, index it, chat with the system, and receive grounded answers with sources.
