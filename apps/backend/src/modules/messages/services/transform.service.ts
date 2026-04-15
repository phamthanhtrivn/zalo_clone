import { Injectable } from '@nestjs/common';
import { StorageService } from '../../../common/storage/storage.service';
import { ChatGateway } from '../../chat/chat.gateway';

@Injectable()
export class MessagesTransformService {
  constructor(
    private readonly storageService: StorageService,
    private readonly chatGateway: ChatGateway,
  ) {}

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

  emitMessageForMedias(
    conversationIdStr: string,
    transformedMessage: any,
  ) {
    const file = transformedMessage.content?.file;
    const text = transformedMessage.content?.text;

    if (file?.type === 'IMAGE' || file?.type === 'VIDEO') {
      this.chatGateway.server.to(conversationIdStr).emit('new_media_preview', {
        type: 'IMAGE_VIDEO',
        data: {
          _id: transformedMessage._id,
          content: { file },
          createdAt: transformedMessage.createdAt,
        },
      });
    }

    if (file?.type === 'FILE') {
      this.chatGateway.server.to(conversationIdStr).emit('new_media_preview', {
        type: 'FILE',
        data: {
          _id: transformedMessage._id,
          content: { file },
          createdAt: transformedMessage.createdAt,
        },
      });
    }

    if (text && /(http|https):\/\/[^\s]+/.test(text)) {
      this.chatGateway.server.to(conversationIdStr).emit('new_media_preview', {
        type: 'LINK',
        data: {
          _id: transformedMessage._id,
          content: { text },
          createdAt: transformedMessage.createdAt,
        },
      });
    }
  }
}
