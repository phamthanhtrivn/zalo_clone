import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConversationType } from 'src/common/types/enums/conversation-type';

@Schema({ _id: false })
export class Group {
  @Prop({ required: true })
  name: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: true })
  allowMembersInvite: boolean;

  @Prop({ default: true })
  allowMembersSendMessages: boolean;

  @Prop({ default: false })
  approvalRequired: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId: Types.ObjectId;

  @Prop({ type: String, default: null })
  joinToken: string | null;
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
    type: string;
    createdAt: Date;
  };

  @Prop({ required: true })
  lastMessageAt: Date;

  @Prop({ default: false })
  isAi!: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  targetUserId?: Types.ObjectId;
}

@Schema({ timestamps: true })
export class JoinRequest {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
export const JoinRequestSchema = SchemaFactory.createForClass(JoinRequest);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
