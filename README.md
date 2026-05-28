# StudyDocs AI

StudyDocs AI is a RAG-based chatbot that recommends learning materials from indexed PDF documents.

## Tech Stack

- Backend: NestJS, TypeScript, Prisma, PostgreSQL, pgvector
- AI: Hugging Face embeddings, LangChain RAG prompts, Hugging Face reranking with similarity fallback, OpenAI response generation
- Frontend: React, Vite
- PDF processing: pdf-parse

## Local Demo

Start PostgreSQL and backend:

```bash
cd backend
docker compose up -d
npm install
npm run start:dev
```

Start frontend:

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Open:

```text
http://localhost:5173
```

## Environment

Create `backend/.env` from `backend/.env.example` and set:

```env
DATABASE_URL="postgresql://studydocs:studydocs123@localhost:5433/studydocs_ai?schema=public"
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
HUGGINGFACE_API_KEY="YOUR_HUGGINGFACE_TOKEN"
HUGGINGFACE_API_BASE_URL="https://router.huggingface.co/hf-inference"
HUGGINGFACE_EMBEDDING_MODEL="BAAI/bge-m3"
HUGGINGFACE_EMBEDDING_DIMENSIONS=1024
HUGGINGFACE_EMBEDDING_FALLBACK="none"
HUGGINGFACE_RERANK_MODEL="BAAI/bge-reranker-v2-m3"
RAG_VECTOR_TOP_K=20
RAG_RERANK_TOP_K=5
PORT=3000
```

## Features

- Upload PDF documents with metadata
- Extract and chunk PDF text
- Generate embeddings with Hugging Face models and store vectors in PostgreSQL with pgvector
- Retrieve top-K chunks with vector search
- Retrieve the top 20 chunks, rerank them, and use the best 5 chunks as answer context
- Generate source-grounded answers through a LangChain RAG prompt and OpenAI
- React demo UI for upload, document list, chat, recommendations, source preview, similarity scores, and rerank scores

## Verification

Current status:

- PDF upload, indexing, and chat have been tested successfully with a real PDF.
- The active RAG flow is Hugging Face embeddings -> pgvector top 20 retrieval -> Hugging Face rerank with fallback -> top 5 context -> LangChain prompt -> OpenAI answer.
- Because embeddings use 1024 dimensions, documents indexed with the previous 1536-dimensional OpenAI embeddings must be uploaded and indexed again.

Automated checks:

```bash
cd backend
npm run build
npm test

cd ../frontend
npm run build
```

End-to-end checks require PostgreSQL, `HUGGINGFACE_API_KEY`, `OPENAI_API_KEY`, and at least one PDF uploaded after the 1024-dimensional embedding migration.
