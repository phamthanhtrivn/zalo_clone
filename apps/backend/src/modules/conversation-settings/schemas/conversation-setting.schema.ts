import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class ConversationSetting {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Date, default: null })
  mutedUntil: Date | null;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ default: false })
  hidden: boolean;
  @Prop({
    type: String,
    enum: ['customer', 'family', 'work', 'friends', 'later', 'colleague'],
    default: null,
  })
  category: string | null;
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export type ConversationSettingDocument = ConversationSetting & Document;
export const ConversationSettingSchema =
  SchemaFactory.createForClass(ConversationSetting);

ConversationSettingSchema.index(
  { userId: 1, conversationId: 1 },
  { unique: true },
);

ConversationSettingSchema.index({ userId: 1, pinned: 1 });
