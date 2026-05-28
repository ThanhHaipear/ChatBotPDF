import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { DocumentsModule } from './documents/documents.module';
import { HuggingFaceModule } from './huggingface/huggingface.module';
import { OpenAiModule } from './openai/openai.module';
import { PrismaModule } from './prisma/prisma.module';
import { RagModule } from './rag/rag.module';
import { RerankModule } from './rerank/rerank.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    OpenAiModule,
    HuggingFaceModule,
    RerankModule,
    RagModule,
    DocumentsModule,
    ChatModule,
  ],
})
export class AppModule {}
