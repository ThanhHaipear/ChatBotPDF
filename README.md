# StudyDocs AI

StudyDocs AI is a full-stack RAG application for uploading PDF learning materials, indexing their content, and chatting with the indexed documents in Vietnamese. It extracts PDF text, chunks and embeds the content with Hugging Face, stores vectors in PostgreSQL with pgvector, retrieves and reranks relevant chunks, and generates grounded answers with OpenAI.

## Live Deployment

- Frontend: https://d1pj5tfnec08t0.cloudfront.net
- API base URL: https://d1pj5tfnec08t0.cloudfront.net
- API routes are served through CloudFront and forwarded to the backend ALB.

## Features

- Upload and index one or more PDF files.
- Store document metadata such as title, subject, topic, level, price type, price, and source URL.
- Extract, clean, and chunk PDF text for retrieval.
- Generate 1024-dimensional embeddings with Hugging Face `BAAI/bge-m3`.
- Store embeddings in PostgreSQL using the `pgvector` extension.
- Retrieve relevant chunks with vector search and rerank them with Hugging Face `BAAI/bge-reranker-v2-m3`.
- Generate Vietnamese answers with OpenAI and source-grounded context.
- Show recommended documents and source previews in the chat UI.
- Deploy backend and frontend automatically with GitHub Actions.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, lucide-react |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16, pgvector |
| ORM | Prisma 6 |
| AI | Hugging Face Inference API, OpenAI Responses API, LangChain prompt formatting |
| PDF parsing | pdf-parse |
| Testing | Jest, Supertest |
| Deployment | AWS ECR, ECS Fargate, RDS, S3, CloudFront, ALB, Secrets Manager |
| CI/CD | GitHub Actions with AWS OIDC |

## Architecture

```text
Users
  |
  v
CloudFront
  |-- Static frontend -> S3
  |
  |-- /documents*, /chat* -> Application Load Balancer
                                |
                                v
                         ECS Fargate backend
                                |
                                +-- RDS PostgreSQL + pgvector
                                +-- AWS Secrets Manager
                                +-- CloudWatch Logs
                                +-- OpenAI API
                                +-- Hugging Face API
```

Local development uses the same application structure:

```text
frontend/ React + Vite
    |
    | HTTP
    v
backend/ NestJS API
    |
    +-- pdf-parse
    +-- Hugging Face embeddings and reranking
    +-- Prisma
    +-- PostgreSQL + pgvector
    +-- OpenAI generation
```

## Project Structure

```text
.
|-- .github/workflows/
|   |-- backend.yml             # Backend test, image build, ECR push, ECS deploy
|   `-- frontend.yml            # Frontend build, S3 sync, CloudFront invalidation
|-- backend/
|   |-- prisma/                 # Prisma schema and migrations
|   |-- src/
|   |   |-- chat/               # Chat endpoint and RAG orchestration
|   |   |-- documents/          # PDF upload, parsing, and indexing
|   |   |-- huggingface/        # Embedding service
|   |   |-- openai/             # OpenAI generation service
|   |   |-- rag/                # Prompt and context formatting
|   |   |-- rerank/             # Reranking service
|   |   `-- utils/              # Text cleaning and chunking
|   |-- Dockerfile
|   `-- docker-compose.yml      # Local PostgreSQL + pgvector
|-- frontend/
|   |-- src/main.jsx
|   |-- src/styles.css
|   `-- vite.config.js
|-- AWS_DEPLOY_CICD_GUIDE.md
`-- README.md
```

## Requirements

- Node.js 22 or compatible
- npm
- Docker Desktop or Docker Engine
- OpenAI API key
- Hugging Face token
- AWS CLI, only for deployment operations

## Environment Variables

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
FRONTEND_URL="http://localhost:5173"
```

Frontend can optionally use:

```env
VITE_API_URL="http://localhost:3000"
```

Production secrets are stored in AWS Secrets Manager under `studydocs/backend/*`.

## Local Development

### 1. Start PostgreSQL with pgvector

```bash
cd backend
docker compose up -d
```

### 2. Install backend dependencies and migrate

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

For a clean local reset:

```bash
npx prisma migrate reset
```

### 3. Run the backend

```bash
cd backend
npm run start:dev
```

Backend URL:

```text
http://localhost:3000
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Frontend URL:

```text
http://localhost:5173
```

## API Reference

### Upload PDF

```http
POST /documents/upload
Content-Type: multipart/form-data
```

Form fields:

- `file`: PDF file, required
- `title`: document title, optional
- `subject`: subject or domain, optional, defaults to `General`
- `topic`: topic, optional
- `level`: level, optional
- `priceType`: `FREE`, `PAID`, or `UNSPECIFIED`
- `price`: price, optional
- `sourceUrl`: source URL, optional

The backend accepts one PDF per request. The frontend supports multi-file uploads by submitting files sequentially.

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

### Chat

```http
POST /chat
Content-Type: application/json
```

Example body:

```json
{
  "message": "Summarize this document",
  "subject": "Distributed Systems",
  "topic": "Processes",
  "level": "",
  "priceType": "FREE"
}
```

The response includes:

- `answer`: generated answer
- `recommendedDocuments`: matching document recommendations
- `sources`: retrieved chunks with preview, vector similarity, and rerank score

## RAG Flow

1. User uploads PDF files.
2. Backend extracts text with `pdf-parse`.
3. Text is cleaned and split into overlapping chunks.
4. Each chunk is embedded with Hugging Face.
5. Chunks and vectors are stored in PostgreSQL with pgvector.
6. User asks a question.
7. The question is embedded.
8. pgvector retrieves top candidate chunks.
9. Hugging Face reranker reorders the candidates.
10. OpenAI generates a grounded Vietnamese answer from the selected context.

## Deployment

The current AWS deployment uses:

- ECR repository: `studydocs-ai-backend`
- ECS cluster: `studydocs-cluster`
- ECS service: `studydocs-backend-service`
- RDS instance: `studydocs-postgres`
- S3 bucket: `studydocs-frontend-809574937443`
- CloudFront distribution: `E1MCSVQ2VV8EYU`
- GitHub Actions role: `studydocs-github-actions-role`

Backend Docker image:

```text
809574937443.dkr.ecr.ap-southeast-1.amazonaws.com/studydocs-ai-backend
```

See [AWS_DEPLOY_CICD_GUIDE.md](AWS_DEPLOY_CICD_GUIDE.md) for the detailed deployment checklist.

## CI/CD

GitHub Actions uses AWS OIDC. No long-lived AWS access key is stored in GitHub.

Backend workflow:

```text
.github/workflows/backend.yml
```

On push to `main` with backend changes:

1. Install dependencies.
2. Build the NestJS app.
3. Run Jest tests.
4. Build the Docker image.
5. Push image tags to ECR.
6. Register a new ECS task definition.
7. Deploy the ECS service.

Frontend workflow:

```text
.github/workflows/frontend.yml
```

On push to `main` with frontend changes:

1. Install dependencies.
2. Build the Vite app with `VITE_API_URL`.
3. Sync `frontend/dist` to S3.
4. Invalidate CloudFront.

## Verification

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

Production smoke checks:

```bash
curl https://d1pj5tfnec08t0.cloudfront.net/documents
```

Then open the frontend and upload a small PDF:

```text
https://d1pj5tfnec08t0.cloudfront.net
```

## Operational Notes

- Uploaded PDFs are currently stored on the backend container filesystem at `uploads/`. ECS Fargate storage is ephemeral, so the indexed text and vectors remain in RDS, but original uploaded files are not durable across task replacement.
- For durable original PDF storage, move uploads to S3 and store the S3 key in `Document.fileUrl`.
- The Prisma schema expects `vector(1024)`. Changing the embedding model or vector dimension requires a schema migration and document reindexing.
- Reranking falls back to vector similarity if the Hugging Face rerank endpoint fails.
- Production API keys and database URLs must stay in AWS Secrets Manager or local `.env` files, never in Git.
