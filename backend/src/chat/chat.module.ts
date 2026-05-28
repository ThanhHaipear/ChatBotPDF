import { Module } from '@nestjs/common';
import { HuggingFaceModule } from '../huggingface/huggingface.module';
import { RagModule } from '../rag/rag.module';
import { RerankModule } from '../rerank/rerank.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [HuggingFaceModule, RerankModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
