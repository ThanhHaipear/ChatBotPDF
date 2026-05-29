# StudyDocs AI

StudyDocs AI la ung dung chatbot hoi dap va goi y tai lieu hoc tap tu file PDF. He thong upload PDF, tach noi dung thanh chunks, tao embedding bang Hugging Face, luu vector vao PostgreSQL/pgvector, truy hoi cac doan lien quan, rerank ket qua va dung OpenAI de sinh cau tra loi bang tieng Viet.

## Tinh nang chinh

- Upload va index tai lieu PDF kem metadata: title, subject, topic, level, priceType, price, sourceUrl.
- Trich xuat text tu PDF, lam sach noi dung va chia chunk co overlap.
- Tao embedding 1024 chieu voi Hugging Face model `BAAI/bge-m3`.
- Luu embedding trong PostgreSQL voi extension `pgvector`.
- Truy hoi vector top-K, mac dinh top 20 chunk.
- Rerank bang Hugging Face rerank model, mac dinh `BAAI/bge-reranker-v2-m3`; neu rerank loi thi fallback theo similarity.
- Sinh cau tra loi tu context bang LangChain prompt va OpenAI Responses API.
- Frontend React/Vite gom upload modal, danh sach tai lieu, chat UI, filter, source preview va recommendation.

## Kien truc

```text
frontend/ React + Vite
    |
    | HTTP
    v
backend/ NestJS API
    |
    +-- pdf-parse: doc PDF
    +-- Hugging Face: embedding + rerank
    +-- Prisma: ORM
    +-- PostgreSQL + pgvector: luu document/chunk/vector
    +-- OpenAI: sinh cau tra loi RAG
```

## Cong nghe

- Frontend: React 19, Vite 7, lucide-react
- Backend: NestJS 11, TypeScript, Prisma 6
- Database: PostgreSQL 16, pgvector
- AI/RAG: Hugging Face Inference API, LangChain prompt, OpenAI `gpt-4.1-mini`
- PDF: `pdf-parse`
- Test: Jest, Supertest

## Cau truc thu muc

```text
.
|-- backend/
|   |-- prisma/                 # Prisma schema va migrations
|   |-- src/
|   |   |-- chat/               # API chat va RAG orchestration
|   |   |-- documents/          # Upload, doc PDF, index chunks
|   |   |-- huggingface/        # Embedding service
|   |   |-- openai/             # OpenAI generation service
|   |   |-- rag/                # Format context va prompt
|   |   |-- rerank/             # Rerank service
|   |   `-- utils/              # Clean text, chunk text
|   `-- docker-compose.yml      # PostgreSQL + pgvector
|-- frontend/
|   |-- src/main.jsx            # React app
|   |-- src/styles.css          # UI styles
|   `-- vite.config.js
`-- README.md
```

## Yeu cau moi truong

- Node.js phu hop voi NestJS/Vite hien tai
- npm
- Docker Desktop hoac Docker Engine
- OpenAI API key
- Hugging Face token

## Cau hinh backend

Tao file `backend/.env` tu `backend/.env.example`:

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

Ghi chu:

- Prisma schema dang khai bao `DocumentChunk.embedding` la `vector(1024)`, nen embedding model phai tra ve dung 1024 chieu.
- Neu doi embedding model hoac kich thuoc vector, can tao migration database tuong ung va index lai tai lieu.
- `HUGGINGFACE_EMBEDDING_FALLBACK="hashing"` co the dung de fallback embedding khi khong goi duoc Hugging Face, nhung ket qua chi phu hop de demo/dev.

## Chay local

### 1. Chay database

```bash
cd backend
docker compose up -d
```

### 2. Cai dependency va migrate database

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

Neu can reset database trong moi truong dev:

```bash
npx prisma migrate reset
```

### 3. Chay backend

```bash
cd backend
npm run start:dev
```

Backend mac dinh chay tai:

```text
http://localhost:3000
```

### 4. Chay frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Mo ung dung tai:

```text
http://localhost:5173
```

Frontend mac dinh goi API:

```text
http://localhost:3000
```

Co the doi bang bien moi truong Vite:

```env
VITE_API_URL="http://localhost:3000"
```

## API chinh

### Upload PDF

```http
POST /documents/upload
Content-Type: multipart/form-data
```

Form fields:

- `file`: PDF file, bat buoc
- `title`: ten tai lieu, bat buoc
- `subject`: mon hoc/linh vuc, bat buoc
- `topic`: chu de, tuy chon
- `level`: trinh do, tuy chon
- `priceType`: `FREE` hoac `PAID`, tuy chon
- `price`: gia, tuy chon
- `sourceUrl`: nguon tai lieu, tuy chon

### Lay danh sach tai lieu

```http
GET /documents
```

### Lay chi tiet tai lieu

```http
GET /documents/:id
```

### Xoa tai lieu

```http
DELETE /documents/:id
```

### Chat voi tai lieu

```http
POST /chat
Content-Type: application/json
```

Body:

```json
{
  "message": "Tai lieu nay noi ve noi dung gi?",
  "subject": "Artificial Intelligence",
  "topic": "AI Automation",
  "level": "",
  "priceType": "FREE"
}
```

Response gom:

- `answer`: cau tra loi tu OpenAI dua tren context
- `recommendedDocuments`: danh sach tai lieu phu hop
- `sources`: cac chunk duoc dung lam nguon, kem similarity va rerankScore

## Luong RAG

1. Nguoi dung upload PDF.
2. Backend doc file, trich xuat text va chia chunk, mac dinh 700 tu/chunk va overlap 100 tu.
3. Moi chunk duoc tao embedding bang Hugging Face.
4. Chunk va vector duoc luu vao PostgreSQL/pgvector.
5. Khi chat, cau hoi duoc embedding.
6. pgvector lay top `RAG_VECTOR_TOP_K` chunk theo vector similarity.
7. Rerank service sap xep lai chunks va chon top `RAG_RERANK_TOP_K`.
8. RagService format context va prompt.
9. OpenAI sinh cau tra loi bang tieng Viet, kem recommendation/source cho UI.

## Lenh kiem tra

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

## Luu y van hanh

- Thu muc `backend/uploads` duoc dung de luu file PDF upload local.
- Tai lieu da index bang embedding 1536 chieu cu can upload/index lai vi schema hien tai la `vector(1024)`.
- Rerank co fallback theo similarity neu Hugging Face rerank endpoint khong tra ve score hop le.
- End-to-end can PostgreSQL dang chay, `.env` hop le va it nhat mot PDF da upload/index thanh cong.
