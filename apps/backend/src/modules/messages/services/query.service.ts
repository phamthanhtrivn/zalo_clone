import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../schemas/message.schema';
import { Member } from '../../members/schemas/member.schema';
import { Conversation } from '../../conversations/schemas/conversation.schema';
import { MessagesTransformService } from './transform.service';
import { GetMessagesDto } from '../dto/get-messages.dto';
import { GetAroundPinnedMessage } from '../dto/get-around-pinned-message.dto';
import { GetPinnedMessagesDto } from '../dto/get-pinned-messages.dto';
import { GetMediasPreviewDto } from '../dto/get-medias-preview.dto';
import { GetMediasFileTypeDto } from '../dto/get-medias-file-type.dto';
import { MessageResponse } from '../types/message-response.type';
import { FileType } from 'src/common/types/enums/file-type';
import { StorageService } from 'src/common/storage/storage.service';

@Injectable()
export class MessagesQueryService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Member.name)
    private readonly memberModel: Model<Member>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    private readonly transformService: MessagesTransformService,
    private readonly storageService: StorageService,
  ) { }

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

    const transformedMessages = messages.map((message) =>
      this.transformService.transformMessage(message),
    );

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

    const transformedMessages = messages.map((message) =>
      this.transformService.transformMessage(message),
    );

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

    const [older, targetMessage, newer] = await Promise.all([
      this.messageModel
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
        .lean(),

      this.messageModel
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
        .lean(),

      this.messageModel
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
        .lean(),
    ]);

    const messages = [...older.reverse(), targetMessage, ...newer].filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

    const transformed = messages.map((message) =>
      this.transformService.transformMessage(message),
    );

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

    const transformedMessages = messages.map((message) => this.transformService.transformMessage(message));

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

    const [imagesVideosRaw, filesRaw, rawLinks] = await Promise.all([
      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          'content.files.type': { $in: ['IMAGE', 'VIDEO'] },
        })
        .select('_id content.files createdAt')
        .sort({ _id: -1 })
        .lean(),

      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          'content.files.type': 'FILE',
        })
        .select('_id content.files createdAt')
        .sort({ _id: -1 })
        .lean(),

      this.messageModel
        .find({
          conversationId: new Types.ObjectId(conversationId),
          deletedFor: { $ne: new Types.ObjectId(userId) },
          'content.text': { $regex: /(https?:\/\/[^\s]+)/ },
        })
        .select('_id content.text createdAt')
        .sort({ _id: -1 })
        .lean(),
    ]);

    const images_videos = imagesVideosRaw
      .flatMap((msg: any) =>
        (msg.content?.files || [])
          .filter((f) => f.type === 'IMAGE' || f.type === 'VIDEO')
          .map((file) => ({
            _id: msg._id,
            createdAt: msg.createdAt,
            content: { file },
          })),
      )
      .slice(0, 6);

    const files = filesRaw
      .flatMap((msg: any) =>
        (msg.content?.files || [])
          .filter((f) => f.type === 'FILE')
          .map((file) => ({
            _id: msg._id,
            createdAt: msg.createdAt,
            content: { file },
          })),
      )
      .slice(0, 3);

    const links = rawLinks.flatMap((msg: any) => {
      const matches = msg.content?.text?.match(/https?:\/\/[^\s]+/g) || [];

      return matches.map((url: string) => ({
        _id: msg._id,
        createdAt: msg.createdAt,
        content: { text: url },
      }));
    });

    const signMessageFile = (message: any) => {
      if (message.content?.file) {
        message.content.file.fileKey =
          this.storageService.signFileUrl(message.content.file.fileKey);
      }
      return message;
    };

    return {
      images_videos: images_videos.map(signMessageFile),
      files: files.map(signMessageFile),
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
      query['content.files.type'] = { $in: ['IMAGE', 'VIDEO'] };
    } else if (type === FileType.FILE) {
      query['content.files.type'] = 'FILE';
    } else if (type === 'LINK') {
      query['content.text'] = { $regex: /(http|https):\/\// };
    }

    if (senderId) query.senderId = new Types.ObjectId(senderId);

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    if (cursor) query._id = { $lt: new Types.ObjectId(cursor) };

    const messages = await this.messageModel
      .find(query)
      .sort({ _id: -1 })
      .limit(Number(limit) + 1)
      .lean();

    const results: any[] = [];

    messages.forEach((msg: any) => {
      if (type === 'LINK') {
        const matches = msg.content?.text?.match(/https?:\/\/[^\s]+/g) || [];
        matches.forEach((url: string) => {
          results.push({
            _id: msg._id,
            createdAt: msg.createdAt,
            content: { text: url },
          });
        });
      } else {
        const files = (msg.content?.files || []).filter((f: any) => {
          if (type === FileType.IMAGE || type === FileType.VIDEO) {
            return f.type === 'IMAGE' || f.type === 'VIDEO';
          }
          return f.type === type;
        });

        files.forEach((file: any) => {
          results.push({
            _id: msg._id,
            createdAt: msg.createdAt,
            content: { file: this.transformService.signFile(file) },
          });
        });
      }
    });

    const paginatedResults = results.slice(0, Number(limit));
    const nextCursor = results.length > Number(limit) ? results[results.length - 1]._id : null;

    return {
      messages: paginatedResults,
      nextCursor,
    };
  }
  async getUpdatedMessagesAfterReadReceipt(
    conversationId: string,
    userId: string,
    lastReadMessageId: Types.ObjectId | null,
  ): Promise<any[]> {
    const objectConversationId = new Types.ObjectId(conversationId);
    const objectUserId = new Types.ObjectId(userId);

    // Tìm tất cả messages cần cập nhật readReceipts
    const findFilter: any = {
      conversationId: objectConversationId,
    };

    if (lastReadMessageId) {
      findFilter._id = { $lte: lastReadMessageId };
    }

    const messages = await this.messageModel
      .find(findFilter)
      .populate('readReceipts.userId', '_id profile.name profile.avatarUrl')
      .sort({ _id: 1 })
      .lean();

    // Format messages để trả về
    return messages.map(msg => ({
      _id: msg._id,
      readReceipts: msg.readReceipts,
    }));
  }
}
