import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../schemas/message.schema';
import { Member } from '../../members/schemas/member.schema';
import { Conversation } from '../../conversations/schemas/conversation.schema';
import { MessagesTransformService } from './transform.service';
import { ChatGateway } from '../../chat/chat.gateway';
import { CallMessageDto } from '../dto/call-message.dto';
import { UpdateCallMessageDto } from '../dto/update-call-message.dto';
import { CallStatus } from 'src/common/types/enums/call-status';

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
    private readonly chatGateway: ChatGateway,
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
      readReceipts: [{ userId: new Types.ObjectId(senderId) }],
      repliedId: null,
    });

    const conversationIdStr = conversationId.toString();
    await this.conversationModel.findByIdAndUpdate(conversationIdStr, {
      lastMessageId: message._id,
      lastMessageAt: (message as any).createdAt,
    });

    const populatedMessage = (await this.messageModel
      .findById(message._id)
      .populate('senderId', 'profile.name profile.avatarUrl')
      .lean()) as any;

    if (populatedMessage) {
      const signedMessage = {
        ...populatedMessage,
        _id: populatedMessage._id.toString(),
        conversationId: conversationIdStr,
        senderId: this.transformService.signUser(populatedMessage.senderId),
      };

      if (signedMessage.senderId && signedMessage.senderId._id) {
        signedMessage.senderId._id = signedMessage.senderId._id.toString();
      }

      this.chatGateway.server
        .to(conversationIdStr)
        .emit('new_message', signedMessage);

      const members = await this.memberModel.find({
        conversationId: new Types.ObjectId(conversationIdStr),
        leftAt: null,
      });

      members.forEach((m) => {
        this.chatGateway.server
          .to(m.userId.toString())
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
        { _id: objectMessageId, 'call.status': CallStatus.INITIATED },
        { $set: { 'call.status': CallStatus.RINGING, 'call.duration': 0 } },
        { new: true },
      );

      if (!updated) {
        throw new BadRequestException('Call message not found or not in INITIATED status');
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
        throw new BadRequestException('Call message not found or not in INITIATED or RINGING status');
      }

      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.MISSED });

      return updated;
    }

    if (status === CallStatus.REJECTED) {
      const updated = await this.messageModel.updateOne(
        { _id: objectMessageId, 'call.status': CallStatus.RINGING },
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
        throw new BadRequestException('Call message not found or not in RINGING status');
      }

      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.MISSED });

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
        throw new BadRequestException('Call message not found or not in RINGING status');
      }

      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.BUSY });

      return updated;
    }

    if (status === CallStatus.ACCEPTED) {
      const updated = await this.messageModel.updateOne(
        { _id: objectMessageId, 'call.status': CallStatus.RINGING },
        { $set: { 'call.status': CallStatus.ACCEPTED, 'call.startedAt': new Date() } },
      );

      if (updated.modifiedCount === 0) {
        throw new BadRequestException('Call message not found or not in RINGING status');
      }

      this.chatGateway.server
        .to(conversationId)
        .emit('call_updated', { messageId, status: CallStatus.ACCEPTED });

      return updated;
    }

    if (status === CallStatus.ENDED) {
      const message = await this.messageModel.findOne({
        _id: objectMessageId,
        'call.status': CallStatus.ACCEPTED,
      });

      if (!message || !message.call?.startedAt) {
        throw new BadRequestException('Call message not found or not in ACCEPTED status, or has no start time');
      }

      const now = new Date();
      const duration = (now.getTime() - message.call.startedAt.getTime()) / 1000;

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

      this.chatGateway.server.to(conversationId).emit('call_updated', {
        messageId,
        status: CallStatus.ENDED,
        duration: Math.floor(duration),
      });

      return updated;
    }
  }
}
