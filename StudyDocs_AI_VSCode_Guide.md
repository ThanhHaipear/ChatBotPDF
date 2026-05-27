# StudyDocs AI - Hướng dẫn thực hiện project RAG/NLP trên VSCode

## 1. Mục tiêu project

Tên project:

StudyDocs AI

Mô tả ngắn:

StudyDocs AI là chatbot AI gợi ý tài liệu học tập dựa trên môn học, chủ đề, mức độ, giá tiền và nhu cầu học của người dùng. Hệ thống dùng kiến trúc RAG để đọc tài liệu PDF, tách nội dung, tạo embeddings, lưu vào PostgreSQL + pgvector, tìm kiếm ngữ nghĩa và dùng LLM để trả lời theo tài liệu đã truy xuất.

Project này phù hợp để đưa vào CV vì có đủ:

- NLP
- LLM
- RAG
- Embeddings
- Semantic Search
- Hybrid Search
- PDF Processing
- PostgreSQL + pgvector
- NestJS + TypeScript
- Prisma
- OpenAI API
- Backend API
- Deploy sau này

---

## 2. Kết quả cần đạt

Sau khi hoàn thành MVP, hệ thống làm được các việc sau:

1. Admin upload file PDF tài liệu học tập.
2. Backend đọc nội dung PDF.
3. Backend chia nội dung thành nhiều đoạn nhỏ.
4. Backend tạo embedding cho từng đoạn.
5. Backend lưu document chunks và vector vào PostgreSQL.
6. User nhập câu hỏi hoặc nhu cầu học.
7. Backend tìm các đoạn tài liệu phù hợp bằng vector search.
8. Backend dùng LLM tạo câu trả lời.
9. Chatbot trả về tài liệu được gợi ý, lý do gợi ý và nguồn tham khảo.

Ví dụ user hỏi:

```text
Tôi muốn học React cơ bản, miễn phí, dễ hiểu và có ví dụ thực hành.
```

Chatbot trả lời:

```text
Bạn nên học tài liệu "React Beginner Guide" vì tài liệu này có phần components, props, state và hooks cơ bản. Nội dung phù hợp với người mới, có ví dụ thực hành và miễn phí.
```

---

## 3. Công nghệ sử dụng

Backend:

```text
NestJS
TypeScript
Prisma
PostgreSQL
pgvector
OpenAI API
pdf-parse
Multer
```

Frontend:

```text
React + Vite
Axios
Tailwind CSS
```

Database:

```text
PostgreSQL + pgvector
```

Deploy có thể làm sau:

```text
Frontend: Vercel hoặc Firebase Hosting
Backend: Cloud Run, Render hoặc Railway
Database: Supabase, Neon hoặc Cloud SQL
```

---

## 4. Kiến trúc hệ thống

Luồng index tài liệu:

```text
Upload PDF
-> Extract text
-> Clean text
-> Chunk text
-> Generate embeddings
-> Save chunks + vectors into PostgreSQL
```

Luồng chatbot:

```text
User question
-> Generate query embedding
-> Vector search + keyword search
-> Retrieve top chunks
-> Send context to LLM
-> Generate answer
-> Return recommendations + sources
```

Kiến trúc tổng thể:

```text
React Frontend
    |
    | REST API
    v
NestJS Backend
    |
    | Prisma / Raw SQL
    v
PostgreSQL + pgvector
    |
    | OpenAI API
    v
Embeddings + LLM Response
```

---

## 5. Cấu trúc thư mục nên tạo

Bạn có thể làm backend trước.

```text
studydocs-ai/
│
├── backend/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   │
│   │   ├── documents/
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   └── dto/
│   │   │       └── create-document.dto.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.service.ts
│   │   │   └── dto/
│   │   │       └── chat.dto.ts
│   │   │
│   │   ├── openai/
│   │   │   └── openai.service.ts
│   │   │
│   │   └── utils/
│   │       ├── chunk-text.ts
│   │       └── clean-text.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── uploads/
│   ├── .env
│   ├── package.json
│   └── docker-compose.yml
│
└── frontend/
    └── làm sau
```

---

## 6. Tạo project backend

Mở VSCode.

Tạo folder:

```bash
mkdir studydocs-ai
cd studydocs-ai
```

Tạo NestJS backend:

```bash
npm i -g @nestjs/cli
nest new backend
cd backend
```

Cài thư viện:

```bash
npm install @prisma/client prisma
npm install openai
npm install pdf-parse
npm install multer
npm install @nestjs/platform-express
npm install @nestjs/config
npm install class-validator class-transformer
npm install pg
```

Cài type cho multer và pdf-parse:

```bash
npm install -D @types/multer @types/pdf-parse
```

Khởi tạo Prisma:

```bash
npx prisma init
```

---

## 7. Tạo PostgreSQL + pgvector bằng Docker

Tạo file:

```text
backend/docker-compose.yml
```

Nội dung:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: studydocs_postgres
    restart: always
    environment:
      POSTGRES_USER: studydocs
      POSTGRES_PASSWORD: studydocs123
      POSTGRES_DB: studydocs_ai
    ports:
      - "5433:5432"
    volumes:
      - studydocs_pg_data:/var/lib/postgresql/data

volumes:
  studydocs_pg_data:
```

Chạy database:

```bash
docker compose up -d
```

---

## 8. Cấu hình .env

Mở file:

```text
backend/.env
```

Nội dung:

```env
DATABASE_URL="postgresql://studydocs:studydocs123@localhost:5433/studydocs_ai?schema=public"

OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

PORT=3000
```

Thay YOUR_OPENAI_API_KEY bằng API key thật của bạn.

---

## 9. Prisma schema

Mở file:

```text
backend/prisma/schema.prisma
```

Thay toàn bộ nội dung bằng:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

model Document {
  id          String          @id @default(uuid())
  title       String
  subject     String
  topic       String?
  level       String?
  priceType   String          @default("FREE")
  price       Float?
  sourceUrl   String?
  fileUrl     String?
  chunks      DocumentChunk[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model DocumentChunk {
  id          String   @id @default(uuid())
  documentId  String
  content     String
  pageNumber  Int?
  chunkIndex  Int
  embedding   Unsupported("vector(1536)")
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}

model ChatSession {
  id        String        @id @default(uuid())
  messages  ChatMessage[]
  createdAt DateTime      @default(now())
}

model ChatMessage {
  id        String      @id @default(uuid())
  sessionId String
  role      String
  content   String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())
}
```

Chạy migrate:

```bash
npx prisma migrate dev --name init
```

Tạo Prisma Client:

```bash
npx prisma generate
```

---

## 10. Tạo vector index

Tạo file:

```text
backend/prisma/migrations/manual_vector_index.sql
```

Nội dung:

```sql
CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw_idx
ON "DocumentChunk"
USING hnsw (embedding vector_cosine_ops);
```

Chạy SQL này bằng Prisma:

```bash
npx prisma db execute --file prisma/migrations/manual_vector_index.sql --schema prisma/schema.prisma
```

---

## 11. Tạo PrismaService

Tạo folder:

```bash
mkdir src/prisma
```

Tạo file:

```text
src/prisma/prisma.service.ts
```

Nội dung:

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Tạo file:

```text
src/prisma/prisma.module.ts
```

Nội dung:

```ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## 12. Cấu hình app.module.ts

Mở file:

```text
src/app.module.ts
```

Nội dung:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { DocumentsModule } from "./documents/documents.module";
import { ChatModule } from "./chat/chat.module";
import { OpenAiModule } from "./openai/openai.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    OpenAiModule,
    DocumentsModule,
    ChatModule,
  ],
})
export class AppModule {}
```

---

## 13. Cấu hình main.ts

Mở file:

```text
src/main.ts
```

Nội dung:

```ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`StudyDocs AI backend is running on port ${port}`);
}

bootstrap();
```

---

## 14. Tạo OpenAI module

Tạo folder:

```bash
mkdir src/openai
```

Tạo file:

```text
src/openai/openai.module.ts
```

Nội dung:

```ts
import { Module } from "@nestjs/common";
import { OpenAiService } from "./openai.service";

@Module({
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
```

Tạo file:

```text
src/openai/openai.service.ts
```

Nội dung:

```ts
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  }

  async generateAnswer(userQuestion: string, context: string): Promise<string> {
    const prompt = `
Bạn là StudyDocs AI, chatbot gợi ý tài liệu học tập.

Nhiệm vụ:
1. Trả lời đúng nhu cầu học của người dùng.
2. Chỉ đề xuất tài liệu có trong context.
3. Giải thích vì sao tài liệu phù hợp.
4. Nếu context không đủ, hãy nói rõ là chưa có đủ tài liệu phù hợp.
5. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.

Context:
${context}

Câu hỏi của người dùng:
${userQuestion}
`;

    const response = await this.openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return response.output_text;
  }
}
```

---

## 15. Tạo utility clean text

Tạo folder:

```bash
mkdir src/utils
```

Tạo file:

```text
src/utils/clean-text.ts
```

Nội dung:

```ts
export function cleanText(text: string): string {
  return text
    .replace(/\r/g, " ")
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .trim();
}
```

---

## 16. Tạo utility chunk text

Tạo file:

```text
src/utils/chunk-text.ts
```

Nội dung:

```ts
export function chunkText(text: string, chunkSize = 700, overlap = 100): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  if (words.length === 0) {
    return chunks;
  }

  const step = chunkSize - overlap;

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + chunkSize).join(" ");

    if (chunk.trim().length > 100) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}
```

---

## 17. Tạo Documents module

Tạo bằng CLI:

```bash
nest g module documents
nest g controller documents
nest g service documents
```

Tạo folder dto:

```bash
mkdir src/documents/dto
```

Tạo file:

```text
src/documents/dto/create-document.dto.ts
```

Nội dung:

```ts
import { IsNotEmpty, IsOptional, IsString, IsNumberString } from "class-validator";

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  priceType?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
```

---

## 18. Documents service

Mở file:

```text
src/documents/documents.service.ts
```

Nội dung:

```ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OpenAiService } from "../openai/openai.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { cleanText } from "../utils/clean-text";
import { chunkText } from "../utils/chunk-text";
import * as pdfParse from "pdf-parse";
import * as fs from "fs/promises";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
  ) {}

  async uploadAndIndex(file: Express.Multer.File, dto: CreateDocumentDto) {
    if (!file) {
      throw new BadRequestException("PDF file is required");
    }

    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      throw new BadRequestException("Only PDF files are supported");
    }

    const buffer = await fs.readFile(file.path);
    const parsedPdf = await pdfParse(buffer);

    const text = cleanText(parsedPdf.text || "");

    if (!text || text.length < 100) {
      throw new BadRequestException("PDF does not contain enough readable text");
    }

    const document = await this.prisma.document.create({
      data: {
        title: dto.title,
        subject: dto.subject,
        topic: dto.topic,
        level: dto.level,
        priceType: dto.priceType || "FREE",
        price: dto.price ? Number(dto.price) : null,
        sourceUrl: dto.sourceUrl,
        fileUrl: file.path,
      },
    });

    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.openAiService.createEmbedding(chunks[i]);
      const embeddingString = `[${embedding.join(",")}]`;

      await this.prisma.$executeRawUnsafe(`
        INSERT INTO "DocumentChunk"
          ("id", "documentId", "content", "pageNumber", "chunkIndex", "embedding", "createdAt")
        VALUES
          (gen_random_uuid(), $1, $2, NULL, $3, $4::vector, NOW())
      `, document.id, chunks[i], i, embeddingString);
    }

    return {
      message: "Document uploaded and indexed successfully",
      documentId: document.id,
      title: document.title,
      totalChunks: chunks.length,
    };
  }

  async findAll() {
    return this.prisma.document.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            chunkIndex: true,
            createdAt: true,
          },
          orderBy: {
            chunkIndex: "asc",
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.document.delete({
      where: { id },
    });

    return {
      message: "Document deleted successfully",
    };
  }
}
```

---

## 19. Documents controller

Mở file:

```text
src/documents/documents.controller.ts
```

Nội dung:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto } from "./dto/create-document.dto";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, callback) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
    }),
  )
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.uploadAndIndex(file, dto);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.remove(id);
  }
}
```

---

## 20. Kiểm tra Documents module

Mở file:

```text
src/documents/documents.module.ts
```

Nội dung nên giống:

```ts
import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
```

---

## 21. Tạo Chat module

Tạo bằng CLI:

```bash
nest g module chat
nest g controller chat
nest g service chat
```

Tạo folder dto:

```bash
mkdir src/chat/dto
```

Tạo file:

```text
src/chat/dto/chat.dto.ts
```

Nội dung:

```ts
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ChatDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  priceType?: string;
}
```

---

## 22. Chat service

Mở file:

```text
src/chat/chat.service.ts
```

Nội dung:

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OpenAiService } from "../openai/openai.service";
import { ChatDto } from "./dto/chat.dto";

type RetrievedChunk = {
  id: string;
  content: string;
  title: string;
  subject: string;
  topic: string | null;
  level: string | null;
  priceType: string;
  price: number | null;
  similarity: number;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
  ) {}

  async chat(dto: ChatDto) {
    const queryEmbedding = await this.openAiService.createEmbedding(dto.message);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    const filters: string[] = [];

    if (dto.subject) {
      filters.push(`d."subject" ILIKE '%${this.escapeSql(dto.subject)}%'`);
    }

    if (dto.topic) {
      filters.push(`d."topic" ILIKE '%${this.escapeSql(dto.topic)}%'`);
    }

    if (dto.level) {
      filters.push(`d."level" ILIKE '%${this.escapeSql(dto.level)}%'`);
    }

    if (dto.priceType) {
      filters.push(`d."priceType" = '${this.escapeSql(dto.priceType)}'`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const results = await this.prisma.$queryRawUnsafe<RetrievedChunk[]>(`
      SELECT
        dc."id",
        dc."content",
        d."title",
        d."subject",
        d."topic",
        d."level",
        d."priceType",
        d."price",
        1 - (dc."embedding" <=> $1::vector) AS "similarity"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d."id" = dc."documentId"
      ${whereClause}
      ORDER BY dc."embedding" <=> $1::vector
      LIMIT 8
    `, embeddingString);

    if (results.length === 0) {
      return {
        answer: "Hiện chưa có tài liệu phù hợp với nhu cầu của bạn.",
        sources: [],
      };
    }

    const context = results
      .map((item, index) => {
        return `
Nguồn ${index + 1}
Tên tài liệu: ${item.title}
Môn học: ${item.subject}
Chủ đề: ${item.topic || "Không rõ"}
Trình độ: ${item.level || "Không rõ"}
Giá: ${item.priceType}${item.price ? ` - ${item.price}` : ""}
Độ phù hợp: ${Number(item.similarity).toFixed(3)}
Nội dung:
${item.content}
`;
      })
      .join("\n---\n");

    const answer = await this.openAiService.generateAnswer(dto.message, context);

    return {
      answer,
      recommendedDocuments: this.groupRecommendations(results),
      sources: results.map((item) => ({
        documentTitle: item.title,
        subject: item.subject,
        topic: item.topic,
        level: item.level,
        priceType: item.priceType,
        similarity: Number(item.similarity),
        preview: item.content.slice(0, 300),
      })),
    };
  }

  private groupRecommendations(results: RetrievedChunk[]) {
    const map = new Map<string, RetrievedChunk>();

    for (const item of results) {
      if (!map.has(item.title)) {
        map.set(item.title, item);
      }
    }

    return Array.from(map.values()).map((item) => ({
      title: item.title,
      subject: item.subject,
      topic: item.topic,
      level: item.level,
      priceType: item.priceType,
      price: item.price,
      similarity: Number(item.similarity),
    }));
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
```

Ghi chú:

Code trên dùng raw SQL để dễ demo vector search. Khi làm sản phẩm thật, bạn nên viết query an toàn hơn và hạn chế nối chuỗi SQL trực tiếp.

---

## 23. Chat controller

Mở file:

```text
src/chat/chat.controller.ts
```

Nội dung:

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatDto } from "./dto/chat.dto";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() dto: ChatDto) {
    return this.chatService.chat(dto);
  }
}
```

---

## 24. Kiểm tra Chat module

Mở file:

```text
src/chat/chat.module.ts
```

Nội dung nên giống:

```ts
import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";

@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

---

## 25. Tạo folder uploads

Trong folder backend:

```bash
mkdir uploads
```

---

## 26. Chạy backend

Trong folder backend:

```bash
npm run start:dev
```

Nếu chạy đúng, bạn thấy:

```text
StudyDocs AI backend is running on port 3000
```

---

## 27. Test API upload PDF bằng Postman

Method:

```text
POST
```

URL:

```text
http://localhost:3000/documents/upload
```

Body chọn:

```text
form-data
```

Các field:

```text
file: chọn file PDF
title: React Beginner Guide
subject: Web Development
topic: React
level: Beginner
priceType: FREE
sourceUrl: https://example.com/react-guide
```

Kết quả mong muốn:

```json
{
  "message": "Document uploaded and indexed successfully",
  "documentId": "...",
  "title": "React Beginner Guide",
  "totalChunks": 12
}
```

---

## 28. Test API danh sách documents

Method:

```text
GET
```

URL:

```text
http://localhost:3000/documents
```

---

## 29. Test API chat

Method:

```text
POST
```

URL:

```text
http://localhost:3000/chat
```

Body JSON:

```json
{
  "message": "Tôi muốn học React cơ bản, miễn phí, dễ hiểu và có ví dụ thực hành",
  "subject": "Web Development",
  "topic": "React",
  "level": "Beginner",
  "priceType": "FREE"
}
```

Kết quả mong muốn:

```json
{
  "answer": "...",
  "recommendedDocuments": [],
  "sources": []
}
```

---

## 30. Frontend đơn giản nên làm sau

Sau khi backend chạy ổn, tạo frontend:

```bash
cd ..
npm create vite@latest frontend
cd frontend
npm install
npm install axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Chức năng frontend cần có:

1. Trang upload PDF.
2. Trang danh sách tài liệu.
3. Trang chat.
4. Hiển thị tài liệu được gợi ý.
5. Hiển thị nguồn tài liệu.

Nếu bạn muốn làm nhanh, chỉ cần làm 1 trang Chat trước.

---

## 31. Frontend Chat UI tối giản

Tạo file:

```text
frontend/src/App.jsx
```

Nội dung mẫu:

```jsx
import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:3000";

function App() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setAnswer("");
    setSources([]);

    try {
      const res = await axios.post(`${API_URL}/chat`, {
        message,
      });

      setAnswer(res.data.answer);
      setSources(res.data.sources || []);
    } catch (error) {
      console.error(error);
      setAnswer("Có lỗi xảy ra khi gọi API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>StudyDocs AI</h1>
      <p>AI Chatbot for Learning Material Recommendation</p>

      <textarea
        rows={4}
        style={{ width: "100%", padding: 12 }}
        placeholder="Nhập nhu cầu học của bạn..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        onClick={sendMessage}
        disabled={loading}
        style={{ marginTop: 12, padding: "10px 16px" }}
      >
        {loading ? "Đang xử lý..." : "Gửi"}
      </button>

      {answer && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd" }}>
          <h2>Câu trả lời</h2>
          <p>{answer}</p>
        </div>
      )}

      {sources.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Nguồn tài liệu</h2>
          {sources.map((source, index) => (
            <div
              key={index}
              style={{
                padding: 16,
                marginBottom: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <h3>{source.documentTitle}</h3>
              <p>Subject: {source.subject}</p>
              <p>Topic: {source.topic}</p>
              <p>Similarity: {source.similarity?.toFixed?.(3)}</p>
              <p>{source.preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
```

Chạy frontend:

```bash
npm run dev
```

---

## 32. Dữ liệu PDF nên chuẩn bị

Bạn nên chuẩn bị khoảng 20 đến 30 PDF.

Gợi ý:

```text
5 PDF JavaScript
5 PDF React
5 PDF Node.js
5 PDF Python
5 PDF Database
5 PDF AI hoặc Machine Learning
```

Mỗi PDF nên có metadata rõ:

```text
title
subject
topic
level
priceType
sourceUrl
```

Ví dụ:

```text
Title: React Beginner Guide
Subject: Web Development
Topic: React
Level: Beginner
PriceType: FREE
```

---

## 33. Các lỗi thường gặp

### Lỗi 1: Prisma không nhận vector

Kiểm tra trong schema có:

```prisma
extensions = [vector]
```

Và database đã dùng image:

```text
pgvector/pgvector:pg16
```

### Lỗi 2: Không tạo được extension vector

Vào database chạy:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Lỗi 3: Upload PDF nhưng không đọc được text

Một số PDF là ảnh scan, không có text thật.

Cách xử lý:

- Dùng PDF có text copy được.
- Nếu PDF scan, cần OCR. MVP chưa cần OCR.

### Lỗi 4: OPENAI_API_KEY sai

Kiểm tra file .env:

```env
OPENAI_API_KEY="..."
```

Sau đó restart backend.

### Lỗi 5: CORS

Trong main.ts đã có:

```ts
app.enableCors({
  origin: "*",
});
```

---

## 34. Nâng cấp hybrid search

Sau MVP, bạn có thể nâng cấp search.

Vector search:

```text
Tìm nội dung gần nghĩa với câu hỏi.
```

Keyword search:

```text
Tìm keyword chính xác như React, SQL, Docker, Prisma.
```

Filter search:

```text
Lọc theo subject, topic, level, priceType.
```

Công thức điểm đơn giản:

```text
finalScore = 0.7 * vectorScore + 0.3 * keywordScore
```

Bạn có thể viết trong CV:

```text
Implemented hybrid retrieval by combining semantic vector search, keyword matching, and metadata filtering.
```

---

## 35. Evaluation nên thêm vào README

Bạn nên đo:

```text
Total documents indexed
Total chunks indexed
Average retrieval latency
Average LLM response latency
Top-k retrieved documents
Similarity score
```

Ví dụ README:

```text
Indexed 30 PDF learning materials into 1,250 semantic chunks.
Achieved average retrieval latency below 500ms on local PostgreSQL with pgvector.
Returned source-grounded recommendations using top-k semantic retrieval.
```

---

## 36. Demo nên quay video như thế nào

Video demo 1 đến 2 phút:

1. Mở trang upload tài liệu.
2. Upload một PDF React.
3. Hệ thống báo indexed successfully.
4. Mở trang chat.
5. Hỏi: Tôi muốn học React miễn phí cho người mới.
6. Chatbot trả lời và gợi ý tài liệu.
7. Hiển thị source chunks.
8. Mở database hoặc log để chứng minh có vector search.

---

## 37. README nên viết

Bạn có thể tạo README như sau:

```md
# StudyDocs AI

StudyDocs AI is an AI-powered learning material recommendation chatbot using Retrieval-Augmented Generation.

## Features

- PDF document upload and text extraction
- Text chunking and embedding generation
- Semantic retrieval using PostgreSQL and pgvector
- Hybrid search with metadata filtering
- LLM-powered conversational recommendations
- Source-based answers for learning material suggestions

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- pgvector
- OpenAI API
- pdf-parse
- React

## RAG Pipeline

PDF Upload -> Text Extraction -> Chunking -> Embeddings -> Vector Storage -> Semantic Search -> LLM Response

## API Endpoints

POST /documents/upload
GET /documents
GET /documents/:id
DELETE /documents/:id
POST /chat
```

---

## 38. Cách ghi vào CV

Sau khi làm xong, ghi vào CV:

```text
StudyDocs AI | AI Chatbot for Learning Material Recommendation

• Built an AI chatbot that recommends learning materials based on subject, topic, level, pricing, and user goals.
• Designed a RAG pipeline with PDF extraction, text chunking, embedding generation, and semantic retrieval.
• Implemented hybrid search using PostgreSQL full-text search and pgvector vector similarity search.
• Integrated OpenAI API to generate contextual answers with source-based recommendations.
• Developed backend APIs using NestJS, TypeScript, Prisma, PostgreSQL, and pdf-parse.
• Stored document chunks and embeddings for scalable semantic search and personalized learning support.
```

Bản ngắn hơn:

```text
StudyDocs AI | RAG-based Learning Material Recommendation Chatbot

• Built a RAG chatbot that recommends learning materials from indexed PDF documents.
• Implemented PDF extraction, chunking, embeddings, and vector search with pgvector.
• Integrated OpenAI API to generate source-grounded learning recommendations.
• Developed NestJS APIs with TypeScript, Prisma, PostgreSQL, and pdf-parse.
```

---

## 39. Roadmap làm project

Làm theo thứ tự này để không bị rối:

### Phase 1: Backend cơ bản

- Tạo NestJS project
- Kết nối PostgreSQL
- Tạo Prisma schema
- Tạo Document API

### Phase 2: PDF indexing

- Upload PDF
- Extract text
- Clean text
- Chunk text
- Generate embeddings
- Save chunks

### Phase 3: Chatbot RAG

- Nhận câu hỏi
- Tạo query embedding
- Vector search
- Gửi context vào LLM
- Trả lời kèm nguồn

### Phase 4: Frontend

- Chat UI
- Upload UI
- Document list
- Source preview

### Phase 5: CV-ready

- README
- Screenshots
- Demo video
- Deploy
- CV bullets

---

## 40. Checklist hoàn thành

Bạn chỉ nên đưa vào CV khi có đủ:

```text
[ ] Upload PDF được
[ ] Extract text được
[ ] Chunk text được
[ ] Tạo embedding được
[ ] Lưu vector vào PostgreSQL được
[ ] Search vector được
[ ] Chatbot trả lời theo context được
[ ] Có source tài liệu
[ ] Có README
[ ] Có ảnh demo hoặc video demo
[ ] Có link GitHub
[ ] Có link live demo nếu deploy
```

---

## 41. Phiên bản CV cuối cùng nên ghi

Nếu project đã deploy:

```text
StudyDocs AI | RAG-based Learning Material Recommendation Chatbot 2025
Live Demo | Source Code

• Built a RAG chatbot that recommends learning materials based on subject, topic, level, price, and user goals.
• Designed a PDF indexing pipeline with text extraction, chunking, embedding generation, and vector storage.
• Implemented semantic retrieval using PostgreSQL, pgvector, metadata filtering, and hybrid search logic.
• Integrated OpenAI API to generate contextual answers with source-grounded learning recommendations.
• Developed backend APIs using NestJS, TypeScript, Prisma, PostgreSQL, and pdf-parse.
• Deployed the full-stack demo with a React frontend, API backend, and managed PostgreSQL database.
```

Nếu chưa deploy:

```text
StudyDocs AI | RAG-based Learning Material Recommendation Chatbot 2025
Source Code

• Built a RAG chatbot that recommends learning materials from indexed PDF documents.
• Implemented PDF extraction, chunking, embeddings, and semantic retrieval with pgvector.
• Integrated OpenAI API to generate contextual answers with source-based recommendations.
• Developed backend APIs using NestJS, TypeScript, Prisma, PostgreSQL, and pdf-parse.
```

---

## 42. Nên làm bản nào trước

Bạn nên làm MVP backend trước, chưa cần frontend đẹp.

Thứ tự làm nhanh nhất:

```text
1. NestJS backend
2. PostgreSQL + pgvector
3. Upload PDF
4. Embedding + save vector
5. Chat API
6. React Chat UI
7. README + CV bullets
```

Khi backend chạy ổn, frontend chỉ là phần hiển thị.

---

## 43. Ghi chú quan trọng khi làm trên VSCode

Mỗi khi sửa .env, hãy restart backend.

Mỗi khi sửa schema.prisma, chạy:

```bash
npx prisma migrate dev
npx prisma generate
```

Mỗi khi Docker lỗi, kiểm tra container:

```bash
docker ps
docker logs studydocs_postgres
```

Mỗi khi API lỗi, xem terminal backend trước.

Nếu upload PDF lâu, nguyên nhân thường là:

```text
PDF nhiều trang
Tạo quá nhiều chunks
Gọi OpenAI embedding nhiều lần
```

Cách xử lý:

```text
Dùng PDF nhỏ trước
Giới hạn 5 đến 10 trang
Giảm số chunks trong lúc test
```

---

## 44. Kết luận

Project này đáng làm vì không chỉ là chatbot gọi API. Nó có pipeline xử lý tài liệu, lưu embeddings, tìm kiếm ngữ nghĩa, RAG và trả lời có nguồn.

Bản MVP đủ mạnh để đưa vào CV:

```text
PDF Upload -> Chunking -> Embeddings -> pgvector -> RAG Chatbot -> Recommendations
```

Sau khi hoàn thành, bạn có thể mở rộng thành:

```text
AI study assistant
Course recommendation system
Internal document chatbot
University learning material search engine
```
