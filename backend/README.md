# StudyDocs AI Backend

StudyDocs AI is a RAG backend for recommending learning documents from indexed PDF files.

## Features

- Upload PDF learning documents
- Extract and clean PDF text
- Split text into chunks
- Generate Hugging Face embeddings
- Store chunks and vectors in PostgreSQL + pgvector
- Retrieve relevant chunks with vector search and metadata filters
- Rerank retrieved chunks before answer generation
- Generate source-grounded chatbot answers

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL + pgvector
- Hugging Face Inference API
- LangChain prompt templates
- OpenAI API
- pdf-parse
- Multer

## Setup

```bash
npm install
```

Create `.env`:

```env
DATABASE_URL="postgresql://studydocs:studydocs123@localhost:5433/studydocs_ai?schema=public"
HUGGINGFACE_API_KEY="YOUR_HUGGINGFACE_TOKEN"
HUGGINGFACE_EMBEDDING_MODEL="BAAI/bge-m3"
HUGGINGFACE_RERANK_MODEL="BAAI/bge-reranker-base"
RAG_VECTOR_TOP_K=20
RAG_RERANK_TOP_K=5
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
PORT=3000
```

Start PostgreSQL:

```bash
docker compose up -d
```

Run migrations and vector index:

```bash
npx prisma migrate dev --name init
npx prisma db execute --file prisma/migrations/manual_vector_index.sql --schema prisma/schema.prisma
npx prisma generate
```

Run the API:

```bash
npm run start:dev
```

## API Endpoints

### Upload PDF

`POST /documents/upload`

Use `multipart/form-data`:

```text
file: PDF file
title: React Beginner Guide
subject: Web Development
topic: React
level: Beginner
priceType: FREE
sourceUrl: https://example.com/react-guide
```

### List Documents

`GET /documents`

### Get Document

`GET /documents/:id`

### Delete Document

`DELETE /documents/:id`

### Chat

`POST /chat`

```json
{
  "message": "Toi muon hoc React co ban, mien phi, de hieu va co vi du thuc hanh",
  "subject": "Web Development",
  "topic": "React",
  "level": "Beginner",
  "priceType": "FREE"
}
```

## RAG Pipeline

PDF Upload -> Text Extraction -> Chunking -> Hugging Face Embeddings -> Vector Storage -> Semantic Search Top-K -> Rerank -> LangChain RAG Prompt -> LLM Response
