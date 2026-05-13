import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CallStatus } from 'src/common/types/enums/call-status';
import { CallType } from 'src/common/types/enums/call-type';

@Schema({ _id: false })
export class CallParticipant {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;

  @Prop({ type: Date, default: null })
  leftAt: Date | null;
}

export const CallParticipantSchema = SchemaFactory.createForClass(CallParticipant);

@Schema({ timestamps: true })
export class CallSession extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  hostId: Types.ObjectId;

  @Prop({ type: String, enum: CallType, default: CallType.VIDEO })
  type: CallType;

  @Prop({ type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE' })
  status: string;

  @Prop({ type: [CallParticipantSchema], default: [] })
  participants: CallParticipant[];

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date })
  endedAt: Date;
}

export const CallSessionSchema = SchemaFactory.createForClass(CallSession);
