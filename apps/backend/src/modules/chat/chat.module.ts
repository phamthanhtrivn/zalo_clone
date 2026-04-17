import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { TokenModule } from 'src/common/jwt-token/jwt.module';

@Module({
  imports: [TokenModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
