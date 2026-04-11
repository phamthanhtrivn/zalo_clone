/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
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
import { StorageService } from 'src/common/storage/storage.service';
import { CallMessageDto } from './dto/call-message.dto';
import { UpdateCallMessageDto } from './dto/update-call-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetMediasPreviewDto } from './dto/get-medias-preview.dto';
import { GetMediasFileTypeDto } from './dto/get-medias-file-type.dto';
import { MessageResponse } from './types/message-response.type';
import { GetPinnedMessagesDto } from './dto/get-pinned-messages.dto';
import { GetAroundPinnedMessage } from './dto/get-around-pinned-message.dto';

import { ChatGateway } from '../chat/chat.gateway';
import { ConversationsService } from '../conversations/conversations.service';
import { DeleteMessageForMeDto } from './dto/delete-message-for-me.dto';
import { ConversationType } from 'src/common/types/enums/conversation-type';
import { MemberRole } from 'src/common/types/enums/member-role';
import { CallStatus } from 'src/common/types/enums/call-status';
import { FileType } from 'src/common/types/enums/file-type';
import { ForwardMessageDto } from './dto/forward-message.dto';

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
    private readonly conversationService: ConversationsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getMessagesFromConversation(
    conversationId: string,
    getMesssagesDto: GetMessagesDto,
  ) {
    const { userId, cursor, limit = '15' } = getMesssagesDto;

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    const member = await this.memberModel.findOne({
      userId: userObjectId,
      conversationId: conversationObjectId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const query = {
      conversationId: conversationObjectId,
      deletedFor: { $ne: userObjectId },
      ...(cursor && { _id: { $lt: new Types.ObjectId(cursor) } }),
    };

    const messages = await this.messageModel
      .find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .populate('senderId', 'profile.name profile.avatarUrl')
      .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .populate({
        path: 'repliedId',
        populate: {
          path: 'senderId',
          select: 'profile.name profile.avatarUrl',
        },
      })
      .lean<MessageResponse[]>();

    const transformedMessages = messages.map((message) => ({
      ...message,

      content: {
        ...message.content,
        file: this.signFile(message.content?.file),
      },

      senderId: this.signUser(message.senderId),

      reactions: message.reactions?.map((r) => ({
        ...r,
        userId: this.signUser(r.userId),
      })),

      readReceipts: message.readReceipts?.map((rr) => ({
        ...rr,
        userId: this.signUser(rr.userId),
      })),
    }));

    const finalMessages = transformedMessages.reverse();

    return {
      messages: finalMessages,
      nextCursor:
        transformedMessages.length > 0 ? transformedMessages[0]._id : null,
    };
  }

  async getNewerMessages(
    conversationId: string,
    getMessagesDto: GetMessagesDto,
  ) {
    const { userId, cursor, limit = '15' } = getMessagesDto;

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    const member = await this.memberModel.findOne({
      userId: userObjectId,
      conversationId: conversationObjectId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const cursorObjectId = new Types.ObjectId(cursor);

    const messages = await this.messageModel
      .find({
        conversationId: conversationObjectId,
        _id: { $gt: cursorObjectId },
        deletedFor: { $ne: userObjectId },
      })
      .sort({ _id: 1 })
      .limit(Number(limit))
      .populate('senderId', 'profile.name profile.avatarUrl')
      .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .populate({
        path: 'repliedId',
        populate: {
          path: 'senderId',
          select: 'profile.name profile.avatarUrl',
        },
      })
      .lean<MessageResponse[]>();

    const transformedMessages = messages.map((message) => ({
      ...message,
      content: {
        ...message.content,
        file: this.signFile(message.content?.file),
      },
      senderId: this.signUser(message.senderId),
      reactions: message.reactions?.map((r) => ({
        ...r,
        userId: this.signUser(r.userId),
      })),
      readReceipts: message.readReceipts?.map((rr) => ({
        ...rr,
        userId: this.signUser(rr.userId),
      })),
    }));

    return {
      messages: transformedMessages,
      prevCursor:
        transformedMessages.length > 0
          ? transformedMessages[transformedMessages.length - 1]._id
          : null,
    };
  }

  async getMessagesAroundPinnedMessage(
    conversationId: string,
    getAroundPinnedMessage: GetAroundPinnedMessage,
  ) {
    const { userId, messageId, limit = '15' } = getAroundPinnedMessage;

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    const member = await this.memberModel.findOne({
      userId: userObjectId,
      conversationId: conversationObjectId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const target = await this.messageModel.findById(messageId);

    if (!target) {
      throw new NotFoundException('Message not found');
    }

    const half = Math.floor(Number(limit) / 2);

    // 🔥 OLDER
    const older = await this.messageModel
      .find({
        conversationId: target.conversationId,
        deletedFor: { $ne: userObjectId },
        _id: { $lt: target._id },
      })
      .sort({ _id: -1 })
      .limit(half)
      .populate('senderId', 'profile.name profile.avatarUrl')
      .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .populate({
        path: 'repliedId',
        populate: {
          path: 'senderId',
          select: 'profile.name profile.avatarUrl',
        },
      })
      .lean();

    // TARGET
    const targetMessage = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'profile.name profile.avatarUrl')
      .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .populate({
        path: 'repliedId',
        populate: {
          path: 'senderId',
          select: 'profile.name profile.avatarUrl',
        },
      })
      .lean();

    // NEWER
    const newer = await this.messageModel
      .find({
        conversationId: target.conversationId,
        _id: { $gt: target._id },
        deletedFor: { $ne: userObjectId },
      })
      .sort({ _id: 1 })
      .limit(half)
      .populate('senderId', 'profile.name profile.avatarUrl')
      .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .populate({
        path: 'repliedId',
        populate: {
          path: 'senderId',
          select: 'profile.name profile.avatarUrl',
        },
      })
      .lean();

    // merge
    const messages = [...older.reverse(), targetMessage, ...newer].filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

    // transform data
    const transformed = messages.map((message) => ({
      ...message,
      content: {
        ...message.content,
        file: this.signFile(message.content?.file),
      },
      senderId: this.signUser(message.senderId),
      reactions: message.reactions?.map((r) => ({
        ...r,
        userId: this.signUser(r.userId),
      })),
      readReceipts: message.readReceipts?.map((rr) => ({
        ...rr,
        userId: this.signUser(rr.userId),
      })),
    }));

    return {
      messages: transformed,
      targetId: messageId,
      nextCursor: transformed[0]?._id,
      prevCursor: transformed[transformed.length - 1]?._id,
    };
  }

  async getPinnedMessagesFromConversation(
    conversationId: string,
    getPinnedMessagesDto: GetPinnedMessagesDto,
  ) {
    const { userId } = getPinnedMessagesDto;

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    const member = await this.memberModel.findOne({
      userId: userObjectId,
      conversationId: conversationObjectId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const messages = await this.messageModel
      .find({
        conversationId: conversationObjectId,
        deletedFor: { $ne: userObjectId },
        pinned: true,
        recalled: false,
      })
      .sort({ updatedAt: 1 })
      .populate('senderId', 'profile.name')
      .lean();

    const transformedMessages = messages.map((message) => ({
      ...message,

      content: {
        ...message.content,
        file: this.signFile(message.content?.file),
      },
    }));

    const finalMessages = transformedMessages.reverse();

    return {
      messages: finalMessages,
    };
  }

  async getMediasPreview(
    conversationId: string,
    getMediasPreviewDto: GetMediasPreviewDto,
  ) {
    const { userId } = getMediasPreviewDto;

    const member = await this.memberModel.findOne({
      userId: new Types.ObjectId(userId),
      conversationId: new Types.ObjectId(conversationId),
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const [images_videos, files, rawLinks] = await Promise.all([
      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          'content.file.type': { $in: ['IMAGE', 'VIDEO'] },
        })
        .select('_id content.file createdAt')
        .sort({ _id: -1 })
        .limit(6)
        .lean(),

      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          'content.file.type': 'FILE',
        })
        .select('_id content.file createdAt')
        .sort({ _id: -1 })
        .limit(3)
        .lean(),

      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          deletedFor: { $ne: new Types.ObjectId(userId) },
          'content.text': { $regex: /(http|https):\/\// },
        })
        .select('_id content.text createdAt')
        .sort({ _id: -1 })
        .limit(3)
        .lean(),
    ]);

    const links = rawLinks.flatMap((msg) => {
      const matches = msg.content?.text?.match(/https?:\/\/[^\s]+/g) || [];

      return matches.map((url) => ({
        _id: msg._id,
        createdAt: (msg as any).createdAt,
        content: {
          text: url,
        },
      }));
    });

    for (const message of images_videos) {
      if (message.content?.file) {
        (message.content as any).file.fileKey = this.storageService.signFileUrl(
          (message.content as any).file.fileKey,
        );
      }
    }

    for (const message of files) {
      if (message.content?.file) {
        (message.content as any).file.fileKey = this.storageService.signFileUrl(
          (message.content as any).file.fileKey,
        );
      }
    }

    return {
      images_videos,
      files,
      links,
    };
  }

  async getMediasFileType(
    conversationId: string,
    getMediasFileTypeDto: GetMediasFileTypeDto,
  ) {
    const {
      userId,
      type,
      cursor,
      limit = '15',
      senderId,
      fromDate,
      toDate,
    } = getMediasFileTypeDto;

    const member = await this.memberModel.findOne({
      userId: new Types.ObjectId(userId),
      conversationId: new Types.ObjectId(conversationId),
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const query: any = {
      conversationId: new Types.ObjectId(conversationId),
      deletedFor: { $ne: new Types.ObjectId(userId) },
    };

    if (type === FileType.IMAGE || type === FileType.VIDEO) {
      query['content.file.type'] = { $in: ['IMAGE', 'VIDEO'] };
    }

    if (type === FileType.FILE) {
      query['content.file.type'] = 'FILE';
    }

    if (type === 'LINK') {
      query['content.text'] = { $regex: /(http|https):\/\// };
    }

    if (senderId) {
      query.senderId = new Types.ObjectId(senderId);
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    for (const message of messages) {
      if (message.content?.file) {
        (message.content as any).file.fileKey = this.storageService.signFileUrl(
          (message.content as any).file.fileKey,
        );
      }
    }

    return {
      messages,
      nextCursor:
        messages.length > 0 ? messages[messages.length - 1]._id : null,
    };
  }

  async sendMessage(
    sendMessageDto: SendMessageDto,
    file?: Express.Multer.File,
  ) {
    const { senderId, conversationId, content, repliedId } = sendMessageDto;

    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const member = await this.memberModel.findOne({
      userId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    if (conversation.type === ConversationType.GROUP) {
      if (
        member.role === MemberRole.MEMBER &&
        !conversation.group?.allowMembersSendMessages
      ) {
        throw new BadRequestException(
          'Members are not allowed to send messages in this group',
        );
      }
    }

    const formattedContent: any = {
      text: content?.text ?? null,
      icon: content?.icon ?? null,
      file: null,
    };

    if (file) {
      formattedContent.file = await this.storageService.uploadFile(file);
    }

    if (
      !formattedContent.text &&
      !formattedContent.icon &&
      !formattedContent.file
    ) {
      throw new BadRequestException(
        'Message must contain at least text, icon, or file',
      );
    }

    const message = await this.messageModel.create({
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      content: formattedContent,
      call: null,
      pinned: false,
      recalled: false,
      reactions: [],
      readReceipts: [
        {
          userId: new Types.ObjectId(senderId),
        },
      ],
      repliedId: repliedId ? new Types.ObjectId(repliedId) : null,
    });

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessageId: new Types.ObjectId(message._id),
      lastMessageAt: (message as any).createdAt,
    });

    // Emitting for realtime
    const populatedMessage = (await this.messageModel
      .findById(message._id)
      .populate('senderId', 'profile.name profile.avatarUrl')
      .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .populate({
        path: 'repliedId',
        populate: {
          path: 'senderId',
          select: 'profile.name profile.avatarUrl',
        },
      })
      .lean()) as any;

    if (populatedMessage) {
      const conversationIdStr = conversationId.toString();

      const transformedMessage = this.transformMessage(populatedMessage);

      this.chatGateway.server
        .to(conversationIdStr)
        .emit('new_message', transformedMessage);

      const room =
        this.chatGateway.server.sockets.adapter.rooms.get(conversationIdStr);

      if (room) {
        for (const socketId of room) {
          console.log(socketId);

          const socket: any =
            this.chatGateway.server.sockets.sockets.get(socketId);
          console.log(socket?.data.userId);

          if (socket?.data?.userId !== senderId) {
            await this.readReceiptMessage({
              userId: socket.data.userId,
              conversationId,
            });
          }
        }
      }
    }

    const members = await this.memberModel.find({
      conversationId: new Types.ObjectId(conversationId),
      leftAt: null,
    });

    for (const member of members) {
      const conversations =
        await this.conversationService.getConversationsFromUser(
          member.userId.toString(),
        );

      const conversation = conversations.find(
        (c) => c.conversationId.toString() === conversationId,
      );

      if (conversation) {
        this.chatGateway.server
          .to(member.userId.toString())
          .emit('new_message_sidebar', conversation);
      }
    }

    return message;
  }

  async createCallMessage(callMessageDto: CallMessageDto) {
    const { senderId, conversationId } = callMessageDto;

    const objectSenderId = new Types.ObjectId(senderId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.findOne({
      userId: objectSenderId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const message = await this.messageModel.create({
      senderId: new Types.ObjectId(senderId),
      conversationId: new Types.ObjectId(conversationId),
      content: null,
      call: {
        type: callMessageDto.type,
        status: CallStatus.INITIATED,
        startedAt: null,
        endedAt: null,
        duration: null,
      },
      pinned: false,
      recalled: false,
      reactions: [],
      readReceipts: [
        {
          userId: new Types.ObjectId(senderId),
        },
      ],
      repliedId: null,
    });

    const conversationIdStr = conversationId.toString();
    await this.conversationModel.findByIdAndUpdate(conversationIdStr, {
      lastMessageId: message._id,
      lastMessageAt: (message as any).createdAt,
    });

    // Populate and emit
    const populatedMessage = (await this.messageModel
      .findById(message._id)
      .populate('senderId', 'profile.name profile.avatarUrl')
      .lean()) as any;

    if (populatedMessage) {
      const signedMessage = {
        ...populatedMessage,
        _id: populatedMessage._id.toString(),
        conversationId: conversationIdStr,
        senderId: this.signUser(populatedMessage.senderId),
      };

      if (signedMessage.senderId && signedMessage.senderId._id) {
        signedMessage.senderId._id = signedMessage.senderId._id.toString();
      }

      this.chatGateway.server
        .to(conversationIdStr)
        .emit('new_message', signedMessage);

      // Notify sidebar
      const members = await this.memberModel.find({
        conversationId: new Types.ObjectId(conversationIdStr),
        leftAt: null,
      });

      members.forEach((member) => {
        this.chatGateway.server
          .to(member.userId.toString())
          .emit('new_message_sidebar', signedMessage);
      });
    }

    return message;
  }

  async updateCallMessage(updateCallMessageDto: UpdateCallMessageDto) {
    const { messageId, conversationId, status } = updateCallMessageDto;

    const objectMessageId = new Types.ObjectId(messageId);

    if (status === CallStatus.RINGING) {
      const updated = await this.messageModel.findOneAndUpdate(
        {
          _id: objectMessageId,
          'call.status': CallStatus.INITIATED,
        },
        {
          $set: {
            'call.status': CallStatus.RINGING,
            'call.duration': 0,
          },
        },
        { new: true },
      );

      if (!updated) {
        throw new BadRequestException(
          'Call message not found or not in INITIATED status',
        );
      }

      return updated;
    } else if (status === CallStatus.MISSED) {
      const updated = await this.messageModel.updateOne(
        {
          _id: objectMessageId,
          'call.status': { $in: [CallStatus.INITIATED, CallStatus.RINGING] },
        },
        {
          $set: {
            'call.status': CallStatus.MISSED,
            'call.startedAt': null,
            'call.endedAt': null,
            'call.duration': 0,
          },
        },
      );

      if (updated.modifiedCount === 0) {
        throw new BadRequestException(
          'Call message not found or not in INITIATED or RINGING status',
        );
      }

      console.log(
        `[Socket] Emitting call_updated (MISSED) to room: ${conversationId}`,
      );
      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.MISSED });

      return updated;
    } else if (status === CallStatus.REJECTED) {
      const updated = await this.messageModel.updateOne(
        {
          _id: objectMessageId,
          'call.status': CallStatus.RINGING,
        },
        {
          $set: {
            'call.status': CallStatus.MISSED,
            'call.startedAt': null,
            'call.endedAt': null,
            'call.duration': 0,
          },
        },
      );

      if (updated.modifiedCount === 0) {
        throw new BadRequestException(
          'Call message not found or not in RINGING status',
        );
      }

      console.log(
        `[Socket] Emitting call_updated (REJECTED/MISSED) to room: ${conversationId}`,
      );
      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.MISSED });

      return updated;
    } else if (status === CallStatus.BUSY) {
      const updated = await this.messageModel.updateOne(
        {
          _id: objectMessageId,
          'call.status': CallStatus.RINGING,
        },
        {
          $set: {
            'call.status': CallStatus.BUSY,
            'call.startedAt': null,
            'call.endedAt': null,
            'call.duration': 0,
          },
        },
      );

      if (updated.modifiedCount === 0) {
        throw new BadRequestException(
          'Call message not found or not in RINGING status',
        );
      }

      console.log(
        `[Socket] Emitting call_updated (BUSY) to room: ${conversationId}`,
      );
      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.BUSY });

      return updated;
    } else if (status === CallStatus.ACCEPTED) {
      const updated = await this.messageModel.updateOne(
        {
          _id: objectMessageId,
          'call.status': CallStatus.RINGING,
        },
        {
          $set: {
            'call.status': CallStatus.ACCEPTED,
            'call.startedAt': new Date(),
          },
        },
      );

      if (updated.modifiedCount === 0) {
        throw new BadRequestException(
          'Call message not found or not in RINGING status',
        );
      }

      console.log(
        `[Socket] Emitting call_updated (ACCEPTED) to room: ${conversationId}`,
      );
      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.ACCEPTED });

      return updated;
    } else if (status === CallStatus.ENDED) {
      const message = await this.messageModel.findOne({
        _id: objectMessageId,
        'call.status': CallStatus.ACCEPTED,
      });

      if (!message) {
        throw new BadRequestException(
          'Call message not found or not in ACCEPTED status',
        );
      }

      if (!message.call?.startedAt) {
        throw new BadRequestException('Call has no start time');
      }

      const now = new Date();
      const duration =
        (now.getTime() - message.call.startedAt.getTime()) / 1000;

      const updated = await this.messageModel.updateOne(
        { _id: objectMessageId },
        {
          $set: {
            'call.status': CallStatus.ENDED,
            'call.endedAt': now,
            'call.duration': Math.floor(duration),
          },
        },
      );

      console.log(
        `[Socket] Emitting call_updated (ENDED) to room: ${conversationId}`,
      );
      this.chatGateway.server.to(conversationId).emit('call_updated', {
        messageId,
        status: CallStatus.ENDED,
        duration: Math.floor(duration),
      });

      return updated;
    }
  }

  async pinnedMessage(pinnedMessageDto: PinnedMessageDto) {
    const { userId, messageId, conversationId } = pinnedMessageDto;

    const session = await this.messageModel.db.startSession();
    session.startTransaction();

    try {
      const objectUserId = new Types.ObjectId(userId);
      const objectMessageId = new Types.ObjectId(messageId);
      const objectConversationId = new Types.ObjectId(conversationId);

      const message = await this.messageModel
        .findById(objectMessageId)
        .session(session);

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.conversationId.toString() !== conversationId) {
        throw new BadRequestException(
          'Message does not belong to this conversation',
        );
      }

      if (message.call) {
        throw new BadRequestException('Cannot pin a call message');
      }

      if (message.recalled) {
        throw new BadRequestException('Cannot pin a recalled message');
      }

      const conversation = await this.conversationModel
        .findById(objectConversationId)
        .session(session);

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const member = await this.memberModel
        .findOne({
          userId: objectUserId,
          conversationId: objectConversationId,
          leftAt: null,
        })
        .session(session);

      if (!member) {
        throw new NotFoundException(
          'User is not a participant in this conversation',
        );
      }

      if (
        conversation.type === ConversationType.GROUP &&
        member.role === MemberRole.MEMBER
      ) {
        throw new BadRequestException(
          'Members are not allowed to pin messages in group',
        );
      }

      if (!message.pinned) {
        const pinnedCount = await this.messageModel
          .countDocuments({
            conversationId: objectConversationId,
            pinned: true,
          })
          .session(session);

        if (pinnedCount >= 3) {
          throw new BadRequestException('Maximum pinned messages reached');
        }
      }

      message.pinned = !message.pinned;
      await message.save({ session });

      await session.commitTransaction();
      session.endSession();

      const messages = await this.messageModel
        .find({
          conversationId: objectConversationId,
          pinned: true,
          recalled: false,
        })
        .sort({ updatedAt: -1 })
        .populate('senderId', 'profile.name')
        .lean();

      const transformedMessages = messages.map((message) => ({
        ...message,

        content: {
          ...message.content,
          file: this.signFile(message.content?.file),
        },
      }));

      this.chatGateway.server
        .to(conversationId.toString())
        .emit('message_pinned', {
          messageId: messageId.toString(),
          pinned: message.pinned,
          pinnedMessages: transformedMessages,
        });

      return message;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async recalledMessage(recalledMessageDto: RecalledMessageDto) {
    const { userId, messageId, conversationId } = recalledMessageDto;

    const objectUserId = new Types.ObjectId(userId);
    const objectMessageId = new Types.ObjectId(messageId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.exists({
      userId: objectUserId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const expireDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const message = await this.messageModel.findById(objectMessageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    } else {
      if (message.content?.file) {
        await this.storageService.deleteFile(message.content.file.fileKey);
      }
    }

    const result = await this.messageModel.updateOne(
      {
        _id: objectMessageId,
        conversationId: objectConversationId,
        senderId: objectUserId,
        recalled: false,
        call: null,
        createdAt: { $gte: expireDate },
      },
      {
        $set: { recalled: true, 'content.file': null },
      },
    );

    if (result.matchedCount === 0) {
      throw new BadRequestException(
        'Message cannot be recalled (not found, expired, already recalled, or not sender)',
      );
    }

    const updatedMessage = await this.messageModel.findById(objectMessageId);

    if (updatedMessage) {
      const conversationIdStr = conversationId.toString();
      const messageIdStr = messageId.toString();

      this.chatGateway.server
        .to(conversationIdStr)
        .emit('message_recalled', { messageId: messageIdStr });

      const members = await this.memberModel.find({
        conversationId: new Types.ObjectId(conversationIdStr),
        leftAt: null,
      });

      members.forEach((member) => {
        this.chatGateway.server
          .to(member.userId.toString())
          .emit('message_recalled_sidebar', {
            conversationId: conversationIdStr,
            messageId: messageIdStr,
          });
      });
    }

    return updatedMessage;
  }

  async deleteMessageForMe(deleteMessageForMeDto: DeleteMessageForMeDto) {
    const { userId, messageId, conversationId } = deleteMessageForMeDto;

    const objectUserId = new Types.ObjectId(userId);
    const objectMessageId = new Types.ObjectId(messageId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.exists({
      userId: objectUserId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const message = await this.messageModel.findOne({
      _id: objectMessageId,
      conversationId: objectConversationId,
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.deletedFor?.some((id) => id.equals(objectUserId))) {
      return {
        success: true,
        message: 'Message already deleted for this user',
      };
    }

    await this.messageModel.updateOne(
      { _id: objectMessageId },
      {
        $addToSet: { deletedFor: objectUserId },
      },
    );

    return {
      success: true,
      messageId,
    };
  }

  async forwardMessages(dto: ForwardMessageDto) {
    const objectMessageIds = dto.messageIds.map((id) => new Types.ObjectId(id));

    // lấy message gốc
    const messages = await this.messageModel
      .find({ _id: { $in: objectMessageIds } })
      .sort({ createdAt: 1 }); // giữ thứ tự

    if (!messages.length) {
      throw new NotFoundException('Messages not found');
    }

    const results: any = [];

    await Promise.all(
      dto.targetConversationIds.map(async (convId) => {
        const objectConvId = new Types.ObjectId(convId);

        const member = await this.memberModel.findOne({
          userId: new Types.ObjectId(dto.userId),
          conversationId: objectConvId,
          leftAt: null,
        });

        if (!member) return;

        for (const msg of messages) {
          if (msg.recalled) continue;

          const newMessage = await this.messageModel.create({
            senderId: new Types.ObjectId(dto.userId),
            conversationId: objectConvId,

            content: msg.content,
            call: null,
            pinned: false,
            recalled: false,
            reactions: [],

            readReceipts: [
              {
                userId: new Types.ObjectId(dto.userId),
              },
            ],

            repliedId: null,

            forwardFrom: {
              messageId: msg._id,
              senderId: msg.senderId,
              conversationId: msg.conversationId,
            },
          });

          await this.conversationModel.findByIdAndUpdate(objectConvId, {
            lastMessageId: newMessage._id,
            lastMessageAt: (newMessage as any).createdAt,
          });

          const populatedMessage = await this.messageModel
            .findById(newMessage._id)
            .populate('senderId', 'profile.name profile.avatarUrl')
            .populate('readReceipts.userId', 'profile.name profile.avatarUrl')
            .populate('reactions.userId', 'profile.name profile.avatarUrl')
            .lean();

          const transformed = this.transformMessage(populatedMessage);

          const conversationIdStr = convId.toString();

          // emit message realtime
          this.chatGateway.server
            .to(conversationIdStr)
            .emit('new_message', transformed);

          // auto read receipt cho user khác đang online
          const room =
            this.chatGateway.server.sockets.adapter.rooms.get(
              conversationIdStr,
            );

          if (room) {
            for (const socketId of room) {
              const socket: any =
                this.chatGateway.server.sockets.sockets.get(socketId);

              if (socket?.data?.userId !== dto.userId) {
                await this.readReceiptMessage({
                  userId: socket.data.userId,
                  conversationId: convId,
                });
              }
            }
          }

          results.push(newMessage);
        }

        // update sidebar cho từng member
        const members = await this.memberModel.find({
          conversationId: objectConvId,
          leftAt: null,
        });

        for (const m of members) {
          const conversations =
            await this.conversationService.getConversationsFromUser(
              m.userId.toString(),
            );

          const conversation = conversations.find(
            (c) => c.conversationId.toString() === convId,
          );

          if (conversation) {
            this.chatGateway.server
              .to(m.userId.toString())
              .emit('new_message_sidebar', conversation);
          }
        }
      }),
    );

    return results;
  }

  async reactionMessage(reactionDto: ReactionDto) {
    const { userId, messageId, conversationId, emojiType } = reactionDto;

    const objectUserId = new Types.ObjectId(userId);
    const objectMessageId = new Types.ObjectId(messageId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.exists({
      userId: objectUserId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const incResult = await this.messageModel.updateOne(
      {
        _id: objectMessageId,
        conversationId: objectConversationId,
        recalled: false,
        call: null,
        reactions: {
          $elemMatch: {
            userId: objectUserId,
            emoji: {
              $elemMatch: { name: emojiType },
            },
          },
        },
      },
      {
        $inc: {
          'reactions.$[r].emoji.$[e].quantity': 1,
        },
      },
      {
        arrayFilters: [{ 'r.userId': objectUserId }, { 'e.name': emojiType }],
      },
    );

    if (incResult.modifiedCount > 0) {
      const updatedMessage = await this.messageModel
        .findById(objectMessageId)
        .populate('reactions.userId', 'profile.name profile.avatarUrl')
        .lean();

      const reactions = (updatedMessage?.reactions || []).map((r) => ({
        ...r,
        userId: this.signUser(r.userId),
      }));

      this.chatGateway.server.to(conversationId).emit('message_reacted', {
        messageId,
        reactions: reactions,
      });

      return updatedMessage;
    }

    const pushEmojiResult = await this.messageModel.updateOne(
      {
        _id: objectMessageId,
        conversationId: objectConversationId,
        recalled: false,
        call: null,
        reactions: {
          $elemMatch: {
            userId: objectUserId,
            emoji: {
              $not: {
                $elemMatch: { name: emojiType },
              },
            },
          },
        },
      },
      {
        $push: {
          'reactions.$.emoji': {
            name: emojiType,
            quantity: 1,
          },
        },
      },
    );

    if (pushEmojiResult.modifiedCount > 0) {
      const updatedMessage = await this.messageModel
        .findById(objectMessageId)
        .populate('reactions.userId', 'profile.name profile.avatarUrl')
        .lean();

      const reactions = (updatedMessage?.reactions || []).map((r) => ({
        ...r,
        userId: this.signUser(r.userId),
      }));

      this.chatGateway.server.to(conversationId).emit('message_reacted', {
        messageId,
        reactions: reactions,
      });

      return updatedMessage;
    }

    const pushUserResult = await this.messageModel.updateOne(
      {
        _id: objectMessageId,
        conversationId: objectConversationId,
        recalled: false,
        call: null,
        'reactions.userId': { $ne: objectUserId },
      },
      {
        $push: {
          reactions: {
            userId: objectUserId,
            emoji: [
              {
                name: emojiType,
                quantity: 1,
              },
            ],
          },
        },
      },
    );

    if (pushUserResult.modifiedCount === 0) {
      throw new BadRequestException(
        'Cannot react to this message (not found, recalled, or a call message)',
      );
    }

    const finalMessage = await this.messageModel
      .findById(objectMessageId)
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .lean();

    if (!finalMessage) return;

    const reactions = (finalMessage?.reactions || []).map((r) => ({
      ...r,
      userId: this.signUser(r.userId),
    }));

    this.chatGateway.server
      .to(conversationId.toString())
      .emit('message_reacted', {
        messageId: messageId.toString(),
        reactions: reactions,
      });

    return finalMessage;
  }

  async removeReactionMessage(removeReactionDto: RemoveReactionDto) {
    const { userId, messageId, conversationId } = removeReactionDto;

    const objectUserId = new Types.ObjectId(userId);
    const objectMessageId = new Types.ObjectId(messageId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.exists({
      userId: objectUserId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const result = await this.messageModel.updateOne(
      {
        _id: objectMessageId,
        conversationId: objectConversationId,
        recalled: false,
        call: null,
        'reactions.userId': objectUserId,
      },
      {
        $pull: {
          reactions: { userId: objectUserId },
        },
      },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException(
        'Cannot remove reaction from this message (not found, already removed, recalled, or a call message)',
      );
    }

    const updatedMessage = await this.messageModel
      .findById(objectMessageId)
      .populate('reactions.userId', 'profile.name profile.avatarUrl')
      .lean();

    this.chatGateway.server
      .to(conversationId.toString())
      .emit('message_reacted', {
        messageId: messageId.toString(),
        reactions: updatedMessage?.reactions,
      });

    return updatedMessage;
  }

  async readReceiptMessage(readReceiptDto: ReadReceiptDto) {
    const { userId, conversationId } = readReceiptDto;

    const objectUserId = new Types.ObjectId(userId);
    const objectConversationId = new Types.ObjectId(conversationId);

    const member = await this.memberModel.findOne({
      userId: objectUserId,
      conversationId: objectConversationId,
      leftAt: null,
    });

    if (!member) {
      throw new NotFoundException(
        'User is not a participant in this conversation',
      );
    }

    const conversation = await this.conversationModel.findById(
      objectConversationId,
      { lastMessageId: 1 },
    );

    if (!conversation?.lastMessageId) {
      return { message: 'No messages' };
    }

    const lastMessageId = conversation.lastMessageId;

    if (member.lastReadMessageId?.equals(lastMessageId)) {
      return { message: 'Already read' };
    }

    const updateFilter: any = {
      conversationId: objectConversationId,
      'readReceipts.userId': { $ne: objectUserId },
    };

    if (member.lastReadMessageId) {
      updateFilter._id = { $gt: member.lastReadMessageId };
    }

    await this.messageModel.updateMany(updateFilter, {
      $addToSet: {
        readReceipts: {
          userId: objectUserId,
        },
      },
    });

    const findFilter: any = {
      conversationId: objectConversationId,
    };

    if (member.lastReadMessageId) {
      findFilter._id = { $gt: member.lastReadMessageId };
    }

    const updatedMessages = await this.messageModel
      .find(findFilter)
      .populate({
        path: 'readReceipts.userId',
        select: '_id profile.name profile.avatarUrl',
      })
      .lean();

    const transformedMessages = updatedMessages.map((msg) => {
      if (msg.readReceipts?.length) {
        return {
          ...msg,
          readReceipts: msg.readReceipts.map((r) => {
            const user = r.userId as any;

            let avatarUrl = user?.profile?.avatarUrl;

            if (avatarUrl && !avatarUrl.startsWith('http')) {
              avatarUrl = this.signAvatar(avatarUrl);
            }

            return {
              ...r,
              userId: {
                ...user,
                profile: {
                  ...user.profile,
                  avatarUrl,
                },
              },
            };
          }),
        };
      }

      return msg;
    });

    this.chatGateway.server.to(conversationId.toString()).emit('read_receipt', {
      conversationId,
      messages: transformedMessages,
    });

    await this.memberModel.updateOne(
      { _id: member._id },
      { $set: { lastReadMessageId: lastMessageId } },
    );

    return {
      conversationId,
      userId,
      lastReadMessageId: lastMessageId,
    };
  }

  private signAvatar = (avatar?: string) =>
    avatar ? this.storageService.signFileUrl(avatar) : avatar;

  private signUser = (user?: any) =>
    user
      ? {
          ...user,
          profile: user.profile
            ? {
                ...user.profile,
                avatarUrl: this.signAvatar(user.profile.avatarUrl),
              }
            : user.profile,
        }
      : user;

  private signFile = (file?: any) =>
    file
      ? {
          ...file,
          fileKey: file.fileKey
            ? this.storageService.signFileUrl(file.fileKey)
            : file.fileKey,
        }
      : file;

  private transformMessage(message: any) {
    return {
      ...message,

      content: {
        ...message.content,
        file: this.signFile(message.content?.file),
      },

      senderId: this.signUser(message.senderId),

      reactions: message.reactions?.map((r) => ({
        ...r,
        userId: this.signUser(r.userId),
      })),

      readReceipts: message.readReceipts?.map((rr) => ({
        ...rr,
        userId: this.signUser(rr.userId),
      })),

      repliedId: message.repliedId
        ? {
            ...message.repliedId,
            senderId: this.signUser(message.repliedId.senderId),
          }
        : null,
    };
  }
}
