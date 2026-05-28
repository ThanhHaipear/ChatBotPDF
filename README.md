# StudyDocs AI

StudyDocs AI is a RAG-based chatbot that recommends learning materials from indexed PDF documents.

## Tech Stack

- Backend: NestJS, TypeScript, Prisma, PostgreSQL, pgvector
- AI: Hugging Face embeddings, LangChain RAG prompts, reranking, OpenAI response generation
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
HUGGINGFACE_EMBEDDING_MODEL="BAAI/bge-m3"
HUGGINGFACE_RERANK_MODEL="BAAI/bge-reranker-base"
RAG_VECTOR_TOP_K=20
RAG_RERANK_TOP_K=5
PORT=3000
```

## Features

- Upload PDF documents with metadata
- Extract and chunk PDF text
- Generate embeddings with Hugging Face models and store vectors in PostgreSQL with pgvector
- Retrieve top-K chunks with vector search
- Rerank retrieved chunks before answer generation
- Generate source-grounded answers through a LangChain RAG prompt and OpenAI
- React demo UI for upload, document list, chat, recommendations, and source preview
