/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { forwardRef, Module } from '@nestjs/common';
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
import { ChatModule } from '../chat/chat.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ConversationSettingSchema } from '../conversation-settings/schemas/conversation-setting.schema';
import { ConversationSetting } from '../conversation-settings/schemas/conversation-setting.schema';
import { MessagesQueryService } from './services/query.service';
import { MessagesActionService } from './services/action.service';
import { MessagesCallService } from './services/call.service';
import { MessagesTransformService } from './services/transform.service';

@Module({
  imports: [
    forwardRef(() => ChatModule),
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Member.name, schema: MemberSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: ConversationSetting.name, schema: ConversationSettingSchema },
    ]),
    forwardRef(() => ChatModule),
    forwardRef(() => ConversationsModule),
    MembersModule,
    StorageModule,
  ],
  providers: [
    MessagesService,
    MessagesQueryService,
    MessagesActionService,
    MessagesCallService,
    MessagesTransformService,
  ],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
