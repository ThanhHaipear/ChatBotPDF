# StudyDocs AI

StudyDocs AI is a RAG chatbot for answering questions and recommending learning materials from PDF files. The system uploads PDFs, splits extracted text into chunks, creates Hugging Face embeddings, stores vectors in PostgreSQL with pgvector, retrieves relevant chunks, reranks them, and uses OpenAI to generate Vietnamese answers.

## Key Features

- Upload and index PDF documents with metadata: title, subject, topic, level, priceType, price, and sourceUrl.
- Extract PDF text, clean it, and split it into overlapping chunks.
- Generate 1024-dimensional embeddings with the Hugging Face `BAAI/bge-m3` model.
- Store embeddings in PostgreSQL with the `pgvector` extension.
- Retrieve top-K chunks with vector similarity search, defaulting to the top 20 chunks.
- Rerank results with a Hugging Face reranker, defaulting to `BAAI/bge-reranker-v2-m3`; if reranking fails, the app falls back to similarity scores.
- Generate source-grounded answers with a LangChain prompt and the OpenAI Responses API.
- Provide a React/Vite frontend with an upload modal, document list, chat UI, filters, source previews, and recommendations.

## Architecture

```text
frontend/ React + Vite
    |
    | HTTP
    v
backend/ NestJS API
    |
    +-- pdf-parse: reads PDFs
    +-- Hugging Face: embeddings + reranking
    +-- Prisma: ORM
    +-- PostgreSQL + pgvector: stores documents, chunks, and vectors
    +-- OpenAI: generates RAG answers
```

## Tech Stack

- Frontend: React 19, Vite 7, lucide-react
- Backend: NestJS 11, TypeScript, Prisma 6
- Database: PostgreSQL 16, pgvector
- AI/RAG: Hugging Face Inference API, LangChain prompt, OpenAI `gpt-4.1-mini`
- PDF processing: `pdf-parse`
- Testing: Jest, Supertest

## Project Structure

```text
.
|-- backend/
|   |-- prisma/                 # Prisma schema and migrations
|   |-- src/
|   |   |-- chat/               # Chat API and RAG orchestration
|   |   |-- documents/          # PDF upload, parsing, and indexing
|   |   |-- huggingface/        # Embedding service
|   |   |-- openai/             # OpenAI generation service
|   |   |-- rag/                # Context and prompt formatting
|   |   |-- rerank/             # Reranking service
|   |   `-- utils/              # Text cleaning and chunking
|   `-- docker-compose.yml      # PostgreSQL + pgvector
|-- frontend/
|   |-- src/main.jsx            # React app
|   |-- src/styles.css          # UI styles
|   `-- vite.config.js
`-- README.md
```

## Requirements

- Node.js compatible with the current NestJS/Vite setup
- npm
- Docker Desktop or Docker Engine
- OpenAI API key
- Hugging Face token

## Backend Configuration

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL="postgresql://studydocs:studydocs123@localhost:5433/studydocs_ai?schema=public"
HUGGINGFACE_API_KEY="YOUR_HUGGINGFACE_TOKEN"
HUGGINGFACE_API_BASE_URL="https://router.huggingface.co/hf-inference"
HUGGINGFACE_EMBEDDING_MODEL="BAAI/bge-m3"
HUGGINGFACE_EMBEDDING_DIMENSIONS=1024
HUGGINGFACE_EMBEDDING_FALLBACK="none"
HUGGINGFACE_RERANK_MODEL="BAAI/bge-reranker-v2-m3"
RAG_VECTOR_TOP_K=20
RAG_RERANK_TOP_K=5
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
PORT=3000
```

Notes:

- The Prisma schema defines `DocumentChunk.embedding` as `vector(1024)`, so the embedding model must return exactly 1024 dimensions.
- If you change the embedding model or vector size, create a matching database migration and reindex documents.
- `HUGGINGFACE_EMBEDDING_FALLBACK="hashing"` can be used as a fallback when Hugging Face is unreachable, but it is intended only for demo or development use.

## Local Development

### 1. Start the database

```bash
cd backend
docker compose up -d
```

### 2. Install dependencies and migrate the database

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

To reset the database in development:

```bash
npx prisma migrate reset
```

### 3. Start the backend

```bash
cd backend
npm run start:dev
```

The backend runs at:

```text
http://localhost:3000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Open the app at:

```text
http://localhost:5173
```

The frontend calls this API by default:

```text
http://localhost:3000
```

You can override it with a Vite environment variable:

```env
VITE_API_URL="http://localhost:3000"
```

## API Endpoints

### Upload PDF

```http
POST /documents/upload
Content-Type: multipart/form-data
```

Form fields:

- `file`: PDF file, required
- `title`: document title, required
- `subject`: subject or domain, required
- `topic`: topic, optional
- `level`: level, optional
- `priceType`: `FREE` or `PAID`, optional
- `price`: price, optional
- `sourceUrl`: source URL, optional

### List Documents

```http
GET /documents
```

### Get Document Details

```http
GET /documents/:id
```

### Delete Document

```http
DELETE /documents/:id
```

### Chat With Documents

```http
POST /chat
Content-Type: application/json
```

Body:

```json
{
  "message": "What is this document about?",
  "subject": "Artificial Intelligence",
  "topic": "AI Automation",
  "level": "",
  "priceType": "FREE"
}
```

The response includes:

- `answer`: an OpenAI-generated answer grounded in retrieved context
- `recommendedDocuments`: matching document recommendations
- `sources`: source chunks used for the answer, including similarity and rerankScore

## RAG Flow

1. The user uploads a PDF.
2. The backend reads the file, extracts text, and splits it into chunks, defaulting to 700 words per chunk with a 100-word overlap.
3. Each chunk is embedded with Hugging Face.
4. Chunks and vectors are stored in PostgreSQL/pgvector.
5. During chat, the user question is embedded.
6. pgvector retrieves the top `RAG_VECTOR_TOP_K` chunks by vector similarity.
7. The rerank service reorders chunks and selects the top `RAG_RERANK_TOP_K`.
8. RagService formats the context and prompt.
9. OpenAI generates a Vietnamese answer with recommendations and source data for the UI.

## Verification Commands

Backend:

```bash
cd backend
npm run build
npm test
```

Frontend:

```bash
cd frontend
npm run build
```

## Operational Notes

- `backend/uploads` stores locally uploaded PDF files.
- Documents indexed with the old 1536-dimensional embeddings must be uploaded and indexed again because the current schema uses `vector(1024)`.
- Reranking falls back to vector similarity when the Hugging Face rerank endpoint does not return valid scores.
- End-to-end testing requires PostgreSQL to be running, a valid `.env`, and at least one successfully uploaded and indexed PDF.
