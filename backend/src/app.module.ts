import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { DocumentsModule } from './documents/documents.module';
import { OpenAiModule } from './openai/openai.module';
import { PrismaModule } from './prisma/prisma.module';

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
