import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MemberRole } from 'src/common/types/enums/member-role';

@Schema({ timestamps: true })
export class Member {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop()
  nickName?: string;

  @Prop({ required: true })
  joinedAt: Date;

  @Prop({ type: Date, default: null })
  leftAt?: Date | null;

  @Prop({ type: String, enum: MemberRole, required: true })
  role: MemberRole;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

MemberSchema.index({ userId: 1, conversationId: 1 }, { unique: true });
MemberSchema.index({ conversationId: 1 });
MemberSchema.index({ userId: 1 });
