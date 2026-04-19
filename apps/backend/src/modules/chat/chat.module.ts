import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule), // 👈 THÊM
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule { }
