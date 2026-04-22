import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { TokenModule } from 'src/common/jwt-token/jwt.module';

@Module({
  imports: [forwardRef(() => MessagesModule), TokenModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
