import { Module } from '@nestjs/common';
import { HuggingFaceModule } from '../huggingface/huggingface.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [HuggingFaceModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
