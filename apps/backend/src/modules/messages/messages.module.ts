/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { ConversationSettingSchema } from '../conversation-settings/schemas/conversation-setting.schema';
import { ConversationSetting } from '../conversation-settings/schemas/conversation-setting.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Member.name, schema: MemberSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: ConversationSetting.name, schema: ConversationSettingSchema },
    ]),
    MembersModule,
    StorageModule,
    ChatModule,
    ConversationsModule,
  ],
  providers: [MessagesService, ChatGateway],
  controllers: [MessagesController],
})
export class MessagesModule { }
