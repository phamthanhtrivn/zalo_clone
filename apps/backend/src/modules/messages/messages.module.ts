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

import { Poll, PollSchema } from './schemas/poll.schema';
import { PollVote, PollVoteSchema } from './schemas/poll-vote.schema';
import { PollService } from './services/poll.service';

import { MessagesQueryService } from './services/query.service';
import { MessagesActionService } from './services/action.service';
import { MessagesCallService } from './services/call.service';
import { MessagesTransformService } from './services/transform.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Member.name, schema: MemberSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: ConversationSetting.name, schema: ConversationSettingSchema },
      
      { name: Poll.name, schema: PollSchema },
      { name: PollVote.name, schema: PollVoteSchema },
    ]),
    forwardRef(() => ChatModule), 
    forwardRef(() => ConversationsModule),
    MembersModule,
    StorageModule,
    AiModule,
  ],
  providers: [
    MessagesService,
    MessagesQueryService,
    MessagesActionService,
    MessagesCallService,
    MessagesTransformService,
    
    PollService,
  ],
  controllers: [MessagesController],
  
  exports: [MessagesService, PollService, MessagesCallService],
})
export class MessagesModule {}