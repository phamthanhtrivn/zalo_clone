import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schema';
import { MembersModule } from '../members/members.module';
import { Member, MemberSchema } from '../members/schemas/member.schema';
import {
  Conversation,
  ConversationSchema,
} from '../conversations/schemas/conversation.schema';
import { StorageModule } from 'src/common/storage/storage.module';
import { ChatGateway } from './messages.gateway';
import { ChatModule } from '../chat/chat.module';
import { ConversationsModule } from '../conversations/conversations.module';

import { MessagesQueryService } from './services/query.service';
import { MessagesActionService } from './services/action.service';
import { MessagesCallService } from './services/call.service';
import { MessagesTransformService } from './services/transform.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Member.name, schema: MemberSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    MembersModule,
    StorageModule,
    ChatModule,
    ConversationsModule,
  ],
  providers: [
    MessagesService,
    ChatGateway,
    MessagesQueryService,
    MessagesActionService,
    MessagesCallService,
    MessagesTransformService,
  ],
  controllers: [MessagesController],
})
export class MessagesModule { }
