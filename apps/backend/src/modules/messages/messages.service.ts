/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { Member } from '../members/schemas/member.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { PinnedMessageDto } from './dto/pinned-message.dto';
import { RecalledMessageDto } from './dto/recalled-message.dto';
import { ReactionDto } from './dto/reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import { ReadReceiptDto } from './dto/read-reciept.dto';
import { CallMessageDto } from './dto/call-message.dto';
import { UpdateCallMessageDto } from './dto/update-call-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetMediasPreviewDto } from './dto/get-medias-preview.dto';
import { GetMediasFileTypeDto } from './dto/get-medias-file-type.dto';

import { GetPinnedMessagesDto } from './dto/get-pinned-messages.dto';
import { GetAroundPinnedMessage } from './dto/get-around-pinned-message.dto';
import { DeleteMessageForMeDto } from './dto/delete-message-for-me.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';

import { MessagesQueryService } from './services/query.service';
import { MessagesActionService } from './services/action.service';
import { MessagesCallService } from './services/call.service';
import { ConversationSetting } from '../conversation-settings/schemas/conversation-setting.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatGateway } from '../chat/chat.gateway';
import { StorageService } from 'src/common/storage/storage.service';
import { MessageResponse } from './types/message-response.type';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Member.name)
    private readonly memberModel: Model<Member>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    private readonly storageService: StorageService,
    @InjectModel(ConversationSetting.name)
    private readonly conversationSettingModel: Model<ConversationSetting>,
    private readonly conversationService: ConversationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly queryService: MessagesQueryService,
    private readonly actionService: MessagesActionService,
    private readonly callService: MessagesCallService,
  ) { }

  async getMessagesFromConversation(
    conversationId: string,
    getMessagesDto: GetMessagesDto,
  ) {
    return this.queryService.getMessagesFromConversation(
      conversationId,
      getMessagesDto,
    );
  }

  async getNewerMessages(
    conversationId: string,
    getMessagesDto: GetMessagesDto,
  ) {
    return this.queryService.getNewerMessages(conversationId, getMessagesDto);
  }
  async getMessagesAroundPinnedMessage(
    conversationId: string,
    getAroundPinnedMessage: GetAroundPinnedMessage,
  ) {
    return this.queryService.getMessagesAroundPinnedMessage(
      conversationId,
      getAroundPinnedMessage,
    );
  }

  async getPinnedMessagesFromConversation(
    conversationId: string,
    getPinnedMessagesDto: GetPinnedMessagesDto,
  ) {
    return this.queryService.getPinnedMessagesFromConversation(
      conversationId,
      getPinnedMessagesDto,
    );
  }

  async getMediasPreview(
    conversationId: string,
    getMediasPreviewDto: GetMediasPreviewDto,
  ) {
    return this.queryService.getMediasPreview(
      conversationId,
      getMediasPreviewDto,
    );
  }

  async getMediasFileType(
    conversationId: string,
    getMediasFileTypeDto: GetMediasFileTypeDto,
  ) {
    return this.queryService.getMediasFileType(
      conversationId,
      getMediasFileTypeDto,
    );
  }

  // --- Action Methods ---
  async sendMessage(
    sendMessageDto: SendMessageDto,
    files?: Express.Multer.File[],
  ) {
    return this.actionService.sendMessage(sendMessageDto, files);
  }
  async createCallMessage(callMessageDto: CallMessageDto) {
    return this.callService.createCallMessage(callMessageDto);
  }

  async updateCallMessage(updateCallMessageDto: UpdateCallMessageDto) {
    return this.callService.updateCallMessage(updateCallMessageDto);
  }
  async recalledMessage(recalledMessageDto: RecalledMessageDto) {
    return this.actionService.recalledMessage(recalledMessageDto);
  }

  async deleteMessageForMe(deleteMessageForMeDto: DeleteMessageForMeDto) {
    return this.actionService.deleteMessageForMe(deleteMessageForMeDto);
  }

  async forwardMessages(dto: ForwardMessageDto) {
    return this.actionService.forwardMessages(dto);
  }

  async reactionMessage(reactionDto: ReactionDto) {
    return this.actionService.reactionMessage(reactionDto);
  }

  async removeReactionMessage(removeReactionDto: RemoveReactionDto) {
    return this.actionService.removeReactionMessage(removeReactionDto);
  }

  async readReceiptMessage(readReceiptDto: ReadReceiptDto) {
    return this.actionService.readReceiptMessage(readReceiptDto);
  }

  async pinnedMessage(pinnedMessageDto: PinnedMessageDto) {
    return this.actionService.pinnedMessage(pinnedMessageDto);
  }
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleExpiredMessages() {
    const now = new Date();

    const expiredMessages = await this.messageModel.find({
      expiresAt: { $lte: now },
      expired: false,
    });

    if (!expiredMessages.length) return;

    const ids = expiredMessages.map(m => m._id);

    await this.messageModel.updateMany(
      { _id: { $in: ids } },
      { $set: { expired: true } },
    );
    const grouped = expiredMessages.reduce((acc, m) => {
      const key = m.conversationId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(m._id.toString());
      return acc;
    }, {} as Record<string, string[]>);

    for (const [convId, messageIds] of Object.entries(grouped)) {
      this.chatGateway.server
        .to(convId)
        .emit('messages_expired', { conversationId: convId, messageIds });
    }
  }
  // async checkExpiredMessages() {
  //   const now = new Date();

  //   const expiredMessages = await this.messageModel.find({
  //     expiresAt: { $lte: now, $ne: null },
  //   });

  //   if (!expiredMessages.length) return;

  //   const ids = expiredMessages.map((m) => m._id.toString());
  //   expiredMessages.forEach(m => {
  //     this.chatGateway.server.to(m.conversationId.toString()).emit('messages_expired', { messageIds: [m._id.toString()] });
  //   });
  //   console.log('Expired messages:', ids);
  // }

  async markAsUnread(userId: string, conversationId: string) {
    const objectUserId = new Types.ObjectId(userId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.findOne({
      userId: objectUserId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException('User is not a participant in this conversation');
    }

    const conversation = await this.conversationModel.findById(objectConversationId, { lastMessageId: 1 });

    if (!conversation?.lastMessageId) {
      return { message: 'No messages' };
    }
    const messages = await this.messageModel
      .find({
        conversationId,
        senderId: { $ne: userId },
      })
      .sort({ _id: -1 })
      .limit(2);

    const prevMessage = messages[1] || null;

    await this.memberModel.updateOne(
      { _id: member._id },
      { $set: { lastReadMessageId: prevMessage?._id ?? null } },
    );
    await this.messageModel.updateMany(
      {
        conversationId: objectConversationId,
        _id: { $gt: prevMessage?._id ?? new Types.ObjectId("000000000000000000000000") }
      },
      {
        $pull: {
          readReceipts: { userId: objectUserId }
        }
      }
    );
    this.chatGateway.server.to(conversationId).emit("messages_unread_updated", {
      conversationId,
      userId,
      lastReadMessageId: prevMessage?._id ?? null,
    });

    return { success: true };
    // return this.actionService.readReceiptMessage(readReceiptDto);
  }
}
