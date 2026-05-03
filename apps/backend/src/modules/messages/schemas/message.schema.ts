import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MessageType } from 'src/common/enums/message-type.enum';
import { CallStatus } from 'src/common/types/enums/call-status';
import { CallType } from 'src/common/types/enums/call-type';
import { EmojiType } from 'src/common/types/enums/emoji-type';
import { FileType } from 'src/common/types/enums/file-type';

@Schema({ _id: false })
export class File {
  @Prop()
  fileKey: string;

  @Prop()
  fileName: string;

  @Prop()
  fileSize: number;

  @Prop({ type: String, enum: FileType })
  type: FileType;
}

@Schema({ _id: false })
export class Content {
  @Prop()
  text?: string;

  @Prop()
  icon?: string;

  @Prop({ type: [File] })
  files?: File[];
}

@Schema({ _id: false })
export class Emoji {
  @Prop({ type: String, enum: EmojiType, required: true })
  name: EmojiType;

  @Prop({ required: true, default: 1 })
  quantity: number;
}

@Schema({ _id: false, timestamps: true })
export class Reaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [Emoji], default: [] })
  emoji: Emoji[];
}

@Schema({ _id: false, timestamps: true })
export class ReadReceipt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

@Schema({ _id: false })
export class Call {
  @Prop({ type: String, enum: CallType, required: true })
  type: CallType;

  @Prop({ type: String, enum: CallStatus, required: true })
  status: CallStatus;

  @Prop()
  startedAt: Date;

  @Prop()
  endedAt: Date;

  @Prop()
  duration: number;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  senderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, enum: MessageType, default: MessageType.USER_MESSAGE })
  type: MessageType;

  @Prop({ type: Content })
  content?: Content;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ default: false })
  recalled: boolean;

  @Prop({ type: [Types.ObjectId], default: [] })
  deletedFor?: Types.ObjectId[];

  @Prop({ type: [Reaction], default: [] })
  reactions?: Reaction[];

  @Prop({ type: [ReadReceipt], default: [] })
  readReceipts?: ReadReceipt[];

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  repliedId?: Types.ObjectId;

  @Prop({ type: Call })
  call?: Call;

  @Prop({ type: Types.ObjectId, ref: 'Poll', required: false })
  pollId?: Types.ObjectId;

  // Tính năng tin nhắn tự hủy (từ PhamThanhTri)
  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ default: false })
  expired: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  targetUserId?: Types.ObjectId;

  // Khai báo để sửa lỗi TypeScript
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexing
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({
  conversationId: 1,
  'content.files.type': 1,
  createdAt: -1,
});
MessageSchema.index({ senderId: 1 });
// MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
