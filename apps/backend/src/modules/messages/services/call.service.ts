import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import { Message } from '../schemas/message.schema';
import { Member } from '../../members/schemas/member.schema';
import { Conversation } from '../../conversations/schemas/conversation.schema';
import { MessagesTransformService } from './transform.service';
import { CallMessageDto } from '../dto/call-message.dto';
import { UpdateCallMessageDto } from '../dto/update-call-message.dto';
import { CallStatus } from 'src/common/types/enums/call-status';
import { RedisService } from 'src/common/redis/redis.service';
import { REDIS_CHANNEL_SOCKET_EVENTS } from 'src/common/constants/redis.constant';

interface PopulatedSender {
  _id: Types.ObjectId;
  profile: {
    name: string;
    avatarUrl: string;
  };
}

interface PopulatedMessage extends Document, Omit<Message, 'senderId'> {
  senderId: PopulatedSender;
}

@Injectable()
export class MessagesCallService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Member.name)
    private readonly memberModel: Model<Member>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    private readonly transformService: MessagesTransformService,
    private readonly redisService: RedisService,
  ) {}

  async createCallMessage(callMessageDto: CallMessageDto) {
    const { senderId, conversationId } = callMessageDto;

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

    // Phase 1: Optimize DB Queries - populate directly on created document
    const messageDoc = await this.messageModel.create({
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
      readReceipts: [{ userId: new Types.ObjectId(senderId) }],
      repliedId: null,
    });

    const conversationIdStr = conversationId.toString();
    await this.conversationModel.findByIdAndUpdate(conversationIdStr, {
      lastMessageId: messageDoc._id,
      lastMessageAt: messageDoc.createdAt,
    });

    // Phase 1: Clean Types & Optimize populate (PM note: use populate on doc)
    const populatedMessage = (await messageDoc.populate({
      path: 'senderId',
      select: 'profile.name profile.avatarUrl',
    })) as unknown as PopulatedMessage;

    if (populatedMessage) {
      // PM note: Use toObject() instead of lean()
      const rawMessage = populatedMessage.toObject();
      const signedMessage = {
        ...rawMessage,
        _id: rawMessage._id.toHexString(),
        conversationId: conversationIdStr,
        senderId: this.transformService.signUser(rawMessage.senderId),
      };

      if (signedMessage.senderId && signedMessage.senderId._id) {
        signedMessage.senderId._id = signedMessage.senderId._id.toString();
      }

      // Bắn event cho room hội thoại qua Redis
      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: conversationIdStr,
        event: 'new_message',
        data: signedMessage,
      });

      const members = await this.memberModel.find({
        conversationId: new Types.ObjectId(conversationIdStr),
        leftAt: null,
      });

      // Phase 1: Remove Redis Bottleneck - use Promise.all
      await Promise.all(
        members.map((m) =>
          this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
            room: m.userId.toString(),
            event: 'new_message_sidebar',
            data: signedMessage,
          }),
        ),
      );
    }

    return messageDoc;
  }

  async updateCallMessage(updateCallMessageDto: UpdateCallMessageDto) {
    const { messageId, conversationId, status } = updateCallMessageDto;
    const objectMessageId = new Types.ObjectId(messageId);

    if (status === CallStatus.RINGING) {
      const updated = await this.messageModel.findOneAndUpdate(
        { _id: objectMessageId, 'call.status': CallStatus.INITIATED },
        { $set: { 'call.status': CallStatus.RINGING, 'call.duration': 0 } },
        { new: true },
      );

      if (!updated) {
        throw new BadRequestException(
          'Call message not found or not in INITIATED status',
        );
      }
      return updated;
    }

    if (status === CallStatus.MISSED) {
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

      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: conversationId,
        event: 'call_updated',
        data: { messageId, status: CallStatus.MISSED, conversationId },
      });

      return updated;
    }

    if (status === CallStatus.REJECTED) {
      const updated = await this.messageModel.updateOne(
        { _id: objectMessageId, 'call.status': CallStatus.RINGING },
        {
          $set: {
            'call.status': CallStatus.REJECTED,
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

      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: conversationId,
        event: 'call_updated',
        data: { messageId, status: CallStatus.REJECTED, conversationId },
      });

      return updated;
    }

    if (status === CallStatus.BUSY) {
      const updated = await this.messageModel.updateOne(
        { _id: objectMessageId, 'call.status': CallStatus.RINGING },
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

      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: conversationId,
        event: 'call_updated',
        data: { messageId, status: CallStatus.BUSY, conversationId },
      });

      return updated;
    }

    if (status === CallStatus.ACCEPTED) {
      const updated = await this.messageModel.updateOne(
        { _id: objectMessageId, 'call.status': CallStatus.RINGING },
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

      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: conversationId,
        event: 'call_updated',
        data: { messageId, status: CallStatus.ACCEPTED, conversationId },
      });

      return updated;
    }

    if (status === CallStatus.ENDED) {
      const message = await this.messageModel.findOne({
        _id: objectMessageId,
        'call.status': CallStatus.ACCEPTED,
      });

      if (!message || !message.call?.startedAt) {
        throw new BadRequestException(
          'Call message not found or not in ACCEPTED status, or has no start time',
        );
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

      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: conversationId,
        event: 'call_updated',
        data: {
          messageId,
          status: CallStatus.ENDED,
          duration: Math.floor(duration),
          conversationId,
        },
      });

      return updated;
    }

    // Phase 1: Fix Missing Return - catch unhandled status updates
    throw new BadRequestException('Invalid call status transition');
  }
}
