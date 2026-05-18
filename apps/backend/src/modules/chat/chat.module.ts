import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { TokenModule } from 'src/common/jwt-token/jwt.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    forwardRef(() => UsersModule),
    TokenModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule { }
