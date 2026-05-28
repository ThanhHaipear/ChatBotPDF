import { Module } from '@nestjs/common';
import { OpenAiModule } from '../openai/openai.module';
import { RagService } from './rag.service';

@Module({
  imports: [OpenAiModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
