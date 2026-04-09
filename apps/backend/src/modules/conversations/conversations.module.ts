import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Member, MemberSchema } from '../members/schemas/member.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

import { StorageModule } from 'src/common/storage/storage.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    ChatModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Member.name, schema: MemberSchema },
      { name: Message.name, schema: MessageSchema },
      { name: 'User', schema: UserSchema },
    ]),
    StorageModule,
  ],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
