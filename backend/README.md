# StudyDocs AI Backend

StudyDocs AI is a RAG backend for recommending learning documents from indexed PDF files.

## Features

- Upload PDF learning documents
- Extract and clean PDF text
- Split text into chunks
- Generate OpenAI embeddings
- Store chunks and vectors in PostgreSQL + pgvector
- Retrieve relevant chunks with vector search and metadata filters
- Generate source-grounded chatbot answers

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL + pgvector
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

PDF Upload -> Text Extraction -> Chunking -> Embeddings -> Vector Storage -> Semantic Search -> LLM Response
