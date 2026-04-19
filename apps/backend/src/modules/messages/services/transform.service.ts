import { Injectable } from '@nestjs/common';
import { StorageService } from '../../../common/storage/storage.service';
import { RedisService } from 'src/common/redis/redis.service';
import { REDIS_CHANNEL_SOCKET_EVENTS } from 'src/common/constants/redis.constant';

@Injectable()
export class MessagesTransformService {
  constructor(
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
  ) { }

  signAvatar = (avatar?: string) =>
    avatar ? this.storageService.signFileUrl(avatar) : avatar;

  signUser = (user?: any) =>
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

  signFile = (file?: any) =>
    file
      ? {
        ...file,
        fileKey: file.fileKey
          ? this.storageService.signFileUrl(file.fileKey)
          : file.fileKey,
      }
      : file;

  transformMessage(message: any) {
    return {
      ...message,
      content: {
        ...message.content,
        files: message.content?.files?.map((file) => this.signFile(file)),
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

  getMediaEvents(transformedMessage: any) {
    const files = transformedMessage.content?.files || [];
    const text = transformedMessage.content?.text;

    const events: any[] = [];

    const mediasFile = files.filter(
      (file) => file?.type === 'IMAGE' || file?.type === 'VIDEO',
    );

    const documentsFile = files.filter(
      (file) => file?.type === 'FILE',
    );

    mediasFile.forEach((file) => {
      events.push({
        type: 'IMAGE_VIDEO',
        data: {
          _id: transformedMessage._id,
          content: { file },
          createdAt: transformedMessage.createdAt,
        },
      });
    });

    documentsFile.forEach((file) => {
      events.push({
        type: 'FILE',
        data: {
          _id: transformedMessage._id,
          content: { file },
          createdAt: transformedMessage.createdAt,
        },
      });
    });

    if (text && /(http|https):\/\/[^\s]+/.test(text)) {
      events.push({
        type: 'LINK',
        data: {
          _id: transformedMessage._id,
          content: { text },
          createdAt: transformedMessage.createdAt,
        },
      });
    }

    return events;
  }

  async emitMessageForMedias(conversationId: string, transformedMessage: any) {
    const events = this.getMediaEvents(transformedMessage);

    for (const event of events) {
      await this.redisService.publish(REDIS_CHANNEL_SOCKET_EVENTS, {
        room: `media_${conversationId}_${event.type}`,
        event: 'new_media',
        data: { type: event.type, data: event.data },
      });
    }
  }
}
