import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConversationType } from 'src/common/types/enums/conversation-type';

@Schema({ _id: false })
export class Group {
  @Prop({ required: true })
  name: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: false })
  allowMembersInvite: boolean;

  @Prop({ default: false })
  allowMembersSendMessages: boolean;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: String, enum: ConversationType, required: true })
  type: ConversationType;

  @Prop({ type: Group })
  group?: Group;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: false })
  lastMessageId?: Types.ObjectId;

  @Prop({ type: Object })
  lastMessage?: {
    _id: Types.ObjectId;
    senderId: Types.ObjectId;
    senderName: string;
    text: string;
    createdAt: Date;
  };

  @Prop({ required: true })
  lastMessageAt: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  participants: Types.ObjectId[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ lastMessageAt: -1 });
