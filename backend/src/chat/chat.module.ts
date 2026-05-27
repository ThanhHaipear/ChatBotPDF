import { Module } from '@nestjs/common';
import { OpenAiModule } from '../openai/openai.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [OpenAiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
